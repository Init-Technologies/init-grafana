package plugin

import (
	"context"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"net/url"
	"sort"
	"strings"

	//"strconv"
	"time"

	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/backend/instancemgmt"
	"github.com/grafana/grafana-plugin-sdk-go/backend/log"
	"github.com/grafana/grafana-plugin-sdk-go/data"
	"github.com/init/in-view/pkg/models"
)

type Todo struct {
	UserID    int    `json:"userId"`
	ID        int    `json:"id"`
	Title     string `json:"title"`
	Completed bool   `json:"completed"`
}

// Define the struct to match your JSON data
type SensorData struct {
	VariableID int        `json:"VariableId"`
	Value      float64    `json:"Value"`
	Timestamp  CustomTime `json:"timestamp"`
	Quality    int        `json:"quality"`
}

type Variables struct {
	ID           int    `json:"id"`
	VariableName string `json:"variableName"`
}

type Connections struct {
	ID             int    `json:"id"`
	ConnectionName string `json:"name"`
}

type LiveValues struct {
	ID  int `json:"VariableId"`
	Val any `json:"Value"`
}

// CustomTime is a wrapper around time.Time to handle the timestamp format
type CustomTime struct {
	time.Time
}

type rawLiveValue struct {
	Timestamp string  `json:"timestamp"`
	Value     float64 `json:"Value"`
}

type LiveValueTimeseries struct {
	Timestamp time.Time `json:"timestamp"`
	Value     float64   `json:"value"`
}

// UnmarshalJSON implements the json.Unmarshaler interface
func (ct *CustomTime) UnmarshalJSON(data []byte) error {
	var s string
	if err := json.Unmarshal(data, &s); err != nil {
		return err
	}

	// Parse the time without requiring timezone information
	t, err := time.Parse("2006-01-02T15:04:05", s)
	if err != nil {
		// Try parsing with timezone if the first attempt fails
		t, err = time.Parse(time.RFC3339, s)
		if err != nil {
			return err
		}
	}

	ct.Time = t
	return nil
}

// Make sure Datasource implements required interfaces. This is important to do
// since otherwise we will only get a not implemented error response from plugin in
// runtime. In this example datasource instance implements backend.QueryDataHandler,
// backend.CheckHealthHandler interfaces. Plugin should not implement all these
// interfaces - only those which are required for a particular task.
var (
	_ backend.QueryDataHandler      = (*Datasource)(nil)
	_ backend.CheckHealthHandler    = (*Datasource)(nil)
	_ instancemgmt.InstanceDisposer = (*Datasource)(nil)
	_ backend.CallResourceHandler   = (*Datasource)(nil)
)

// NewDatasource creates a new datasource instance.
func NewDatasource(_ context.Context, _ backend.DataSourceInstanceSettings) (instancemgmt.Instance, error) {
	return &Datasource{}, nil
}

// Datasource is an example datasource which can respond to data queries, reports
// its health and has streaming skills.
type Datasource struct{}

// Dispose here tells plugin SDK that plugin wants to clean up resources when a new instance
// created. As soon as datasource settings change detected by SDK old datasource instance will
// be disposed and a new one will be created using NewSampleDatasource factory function.
func (d *Datasource) Dispose() {
	// Clean up datasource instance resources.
}

// QueryData handles multiple queries and returns multiple responses.
// req contains the queries []DataQuery (where each query contains RefID as a unique identifier).
// The QueryDataResponse contains a map of RefID to the response for each query, and each response
// contains Frames ([]*Frame).
func (d *Datasource) QueryData(ctx context.Context, req *backend.QueryDataRequest) (*backend.QueryDataResponse, error) {
	// create response struct
	response := backend.NewQueryDataResponse()

	// loop over queries and execute them individually.
	for _, q := range req.Queries {
		res := d.query(ctx, req.PluginContext, q, req)

		// save the response in a hashmap
		// based on with RefID as identifier
		response.Responses[q.RefID] = res
	}

	return response, nil
}

type queryModel struct {
	QueryText string `json:"queryText"`
}

func (d *Datasource) query(_ context.Context, pCtx backend.PluginContext, query backend.DataQuery, req *backend.QueryDataRequest) backend.DataResponse {
	var response backend.DataResponse

	// Unmarshal the JSON into our queryModel.
	var qm queryModel

	err := json.Unmarshal(query.JSON, &qm)
	if err != nil {
		return backend.ErrDataResponse(backend.StatusBadRequest, fmt.Sprintf("json unmarshal: %v", err.Error()))
	}

	log.DefaultLogger.Info("Frontend passed queryText:", "queryText", qm.QueryText)

	config, _ := models.LoadPluginSettings(*req.PluginContext.DataSourceInstanceSettings)

	from := query.TimeRange.From.UTC().Format("2006-01-02T15:04:05")
	to := query.TimeRange.To.UTC().Format("2006-01-02T15:04:05")

	// Build URL with time range and varId
	url := fmt.Sprintf(
		"%s/api/public/variables/getHistoryLoggedValuesV2?dateFrom=%s&dateTo=%s&varId=%s",
		config.BaseUrl,
		url.QueryEscape(from),
		url.QueryEscape(to),
		url.QueryEscape(qm.QueryText),
	)

	client := &http.Client{}
	req2, err := http.NewRequest("GET", url, nil)
	if err != nil {
		log.DefaultLogger.Error("Failed to create request:", err)
		return backend.ErrDataResponse(backend.StatusInternal, "Failed to create API request")
	}

	log.DefaultLogger.Info("Request URL:", url)

	req2.Header.Set("Authorization", config.Secrets.ApiKey)
	req2.Header.Set("Accept", "application/json")

	resp, err := client.Do(req2)
	if err != nil {
		log.DefaultLogger.Error("HTTP request failed:", err)
		return backend.ErrDataResponse(backend.StatusBadGateway, "API request failed")
	}
	defer resp.Body.Close()

	body, readErr := ioutil.ReadAll(resp.Body)
	if readErr != nil {
		log.DefaultLogger.Error("Failed to read response body:", readErr)
		return backend.ErrDataResponse(backend.StatusInternal, "Failed to read API response")
	}

	if resp.StatusCode != http.StatusOK {
		if len(body) == 0 {
			return backend.ErrDataResponse(backend.StatusBadRequest,
				fmt.Sprintf("API returned status %d with empty response body", resp.StatusCode))
		}

		// First, check if the response is plain text (non-JSON)
		contentType := resp.Header.Get("Content-Type")
		if !strings.Contains(contentType, "application/json") {
			// Handle plain text error responses
			return backend.ErrDataResponse(backend.StatusBadRequest,
				fmt.Sprintf("API Error (%d): %s", resp.StatusCode, string(body)))
		}

		// Try to parse as JSON error response
		var errResp struct {
			Errors  map[string][]string `json:"errors"`
			Type    string              `json:"type"`
			Title   string              `json:"title"`
			Status  int                 `json:"status"`
			TraceId string              `json:"traceId"` // Note: lowercase 'd' in JSON vs uppercase in struct
		}

		if jsonErr := json.Unmarshal(body, &errResp); jsonErr != nil {
			// If JSON parsing fails, return raw body with content type info
			contentType := resp.Header.Get("Content-Type")
			log.DefaultLogger.Error("Failed to parse error response as JSON:", jsonErr)
			log.DefaultLogger.Error("Content-Type:", contentType)
			return backend.ErrDataResponse(backend.StatusBadRequest,
				fmt.Sprintf("API Error (%d): %s", resp.StatusCode, string(body)))
		}

		// Extract error messages from the errors map
		var errorMessages []string
		for field, messages := range errResp.Errors {
			for _, msg := range messages {
				errorMessages = append(errorMessages, fmt.Sprintf("%s: %s", field, msg))
			}
		}

		// If we have specific field errors, use them
		if len(errorMessages) > 0 {
			return backend.ErrDataResponse(backend.StatusBadRequest,
				fmt.Sprintf("Validation error: %s", strings.Join(errorMessages, "; ")))
		}

		// Fallback to title or generic error
		if errResp.Title != "" {
			return backend.ErrDataResponse(backend.StatusBadRequest, errResp.Title)
		}

		return backend.ErrDataResponse(backend.StatusBadRequest,
			fmt.Sprintf("API Error (%d): %s", resp.StatusCode, string(body)))
	}

	var raw []rawLiveValue
	if err := json.Unmarshal(body, &raw); err != nil {
		log.DefaultLogger.Error("JSON unmarshal error:", err)
		log.DefaultLogger.Error("Raw response:", string(body))
		panic(err)
	}

	var livevalue []LiveValueTimeseries
	for _, r := range raw {
		t, err := time.Parse("2006-01-02T15:04:05", r.Timestamp) // matches "2025-06-27T14:08:30"
		if err != nil {
			log.DefaultLogger.Error("Time parse error:", err)
			continue
		}
		livevalue = append(livevalue, LiveValueTimeseries{
			Timestamp: t,
			Value:     r.Value,
		})
	}
	log.DefaultLogger.Info("LiveValues :", "queryText", qm.QueryText) // Optional: override values if frontend passed QueryText

	frame := data.NewFrame("response")

	times3 := make([]time.Time, len(livevalue))
	values3 := make([]float64, len(livevalue))

	for i, ts := range livevalue {
		times3[i] = ts.Timestamp
		values3[i] = ts.Value
	}
	// Combine into LiveValueTimeseries slice

	frame.Fields = append(frame.Fields,
		data.NewField("time", nil, times3),
		data.NewField("values", nil, values3),
	)

	// add the frames to the response.
	response.Frames = append(response.Frames, frame)

	return response
}

// CheckHealth handles health checks sent from Grafana to the plugin.
// The main use case for these health checks is the test button on the
// datasource configuration page which allows users to verify that
// a datasource is working as expected.
func (d *Datasource) CheckHealth(_ context.Context, req *backend.CheckHealthRequest) (*backend.CheckHealthResult, error) {
	res := &backend.CheckHealthResult{}
	config, err := models.LoadPluginSettings(*req.PluginContext.DataSourceInstanceSettings)

	if err != nil {
		res.Status = backend.HealthStatusError
		res.Message = "Unable to load settings"
		return res, nil
	}

	if config.Secrets.ApiKey == "" {
		res.Status = backend.HealthStatusError
		res.Message = "API key is missing"
		return res, nil
	}

	return &backend.CheckHealthResult{
		Status:  backend.HealthStatusOk,
		Message: "Data source is working",
	}, nil
}

func (ds *Datasource) CallResource(ctx context.Context, req *backend.CallResourceRequest, sender backend.CallResourceResponseSender) error {

	config, _ := models.LoadPluginSettings(*req.PluginContext.DataSourceInstanceSettings)

	if req.Path == "Variables" {

		u, _ := url.Parse(req.URL)
		values := u.Query()
		connId := values.Get("connId")

		log.DefaultLogger.Info("Connection ID :", connId) // Optional: override values if frontend passed QueryText

		externalURL := fmt.Sprintf("%s/api/public/variables-dto?pageIndex=0&pageSize=10&connId=%s", config.BaseUrl, connId)
		client := &http.Client{}
		req, err := http.NewRequest("GET", externalURL, nil)
		if err != nil {
			panic(err)
		}

		req.Header.Set("Authorization", config.Secrets.ApiKey)

		resp, err := client.Do(req)
		if err != nil {
			panic(err)
		}
		defer resp.Body.Close()

		body, _ := ioutil.ReadAll(resp.Body)

		var data []Variables
		err = json.Unmarshal(body, &data)
		if err != nil {
			fmt.Println("JSON unmarshal error:", err)
			fmt.Println("Raw response:", string(body))
			panic(err)
		}

		finalBody, err := json.Marshal(data)

		if err != nil {

			return sender.Send(&backend.CallResourceResponse{

				Status: http.StatusInternalServerError,

				Body: []byte(fmt.Sprintf("Error marshaling response: %v", err)),
			})

		}

		return sender.Send(&backend.CallResourceResponse{

			Status: http.StatusOK,

			Headers: map[string][]string{"Content-Type": {"application/json"}},

			Body: finalBody,
		})

	}

	if req.Path == "Connections" {

		client := &http.Client{}
		req, err := http.NewRequest(
			"GET",
			fmt.Sprintf("%s/api/public/connections?pageIndex=0&pageSize=10", config.BaseUrl),
			nil,
		)
		if err != nil {
			panic(err)
		}

		req.Header.Set("Authorization", config.Secrets.ApiKey)

		resp, err := client.Do(req)
		if err != nil {
			panic(err)
		}
		defer resp.Body.Close()

		body, _ := ioutil.ReadAll(resp.Body)

		var data []Connections
		err = json.Unmarshal(body, &data)
		if err != nil {
			fmt.Println("JSON unmarshal error:", err)
			fmt.Println("Raw response:", string(body))
			panic(err)
		}
		data = append(data, Connections{
			ID:             0,
			ConnectionName: "Internal",
		})

		sort.Slice(data, func(i, j int) bool {
			return data[i].ID < data[j].ID
		})

		finalBody, err := json.Marshal(data)

		if err != nil {

			return sender.Send(&backend.CallResourceResponse{

				Status: http.StatusInternalServerError,

				Body: []byte(fmt.Sprintf("Error marshaling response: %v", err)),
			})

		}

		return sender.Send(&backend.CallResourceResponse{

			Status: http.StatusOK,

			Headers: map[string][]string{"Content-Type": {"application/json"}},

			Body: finalBody,
		})

	}

	// Return 404 for unknown paths

	return sender.Send(&backend.CallResourceResponse{

		Status: http.StatusNotFound,

		Body: []byte(fmt.Sprintf("Unknown path: %s", req.Path)),
	})

}
