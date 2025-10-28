package plugin

import (
	"context"
	"encoding/json"
	"fmt"
	 "io"        
	"io/ioutil"
	"net/http"
	"net/url"
	"sort"
	"time"
	"strings"
	"github.com/grafana/grafana-plugin-sdk-go/backend"
	"github.com/grafana/grafana-plugin-sdk-go/backend/instancemgmt"
	"github.com/grafana/grafana-plugin-sdk-go/backend/log"
	"github.com/grafana/grafana-plugin-sdk-go/data"
	"github.com/init/in-view/pkg/models"
    "strconv"
)

// var GlobalBaseUrl string = "http://192.168.22.48:5123"
var GlobalBaseUrl string = "https://cloud.oilfield-monitor.com"
 //var GlobalBaseUrl string = "https://stage.inviewscada.com"


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


func (d *Datasource) query(_ context.Context, pCtx backend.PluginContext, query backend.DataQuery, req *backend.QueryDataRequest) backend.DataResponse {
	var response backend.DataResponse
	var qm queryModel


	response.Frames = []*data.Frame{}

	log.DefaultLogger.Info("PLUGIN QUERY -- START ----------------------------")
	log.DefaultLogger.Info("PLUGIN QUERY -- Raw query JSON", "json", string(query.JSON))

	// Unmarshal query JSON first
	if err := json.Unmarshal(query.JSON, &qm); err != nil {
		log.DefaultLogger.Error("PLUGIN QUERY -- JSON unmarshal failed", "error", err)
		return backend.ErrDataResponse(backend.StatusBadRequest, fmt.Sprintf("json unmarshal: %v", err))
	}

	log.DefaultLogger.Info("PLUGIN QUERY -- Parsed QueryModel", "queryText", qm.QueryText, "IsAlarm", qm.IsAlarm, "IsEvent", qm.IsEvent, "IsLive", qm.IsLive)

	config, _ := models.LoadPluginSettings(*req.PluginContext.DataSourceInstanceSettings)
	log.DefaultLogger.Info("PLUGIN QUERY -- Loaded Plugin Settings", "baseUrl", GlobalBaseUrl)

	from := query.TimeRange.From.UTC().Format("2006-01-02T15:04:05")
	to := query.TimeRange.To.UTC().Format("2006-01-02T15:04:05")

	// qm.IsLive = false;
	// qm.IsAlarm = false;
	// qm.IsEvent = true;

	// qm.VariableIds = []int{1, 2, 3}

	// stringSlice := make([]string, len(qm.VariableIds))
    // for i, n := range qm.VariableIds {
    //     stringSlice[i] = strconv.Itoa(n)
    // }

    // varIdsString := strings.Join(stringSlice, ",")



	varIds := []string{qm.QueryText}
	joinedVarIds := strings.Join(varIds, ",")
	pageIndex := qm.PageIndex
	pageSize := qm.PageSize
	if pageIndex <= 0 {
		pageIndex = 0
	}
	if pageSize <= 0 {
		pageSize = 10
	}
	var urlStr string
	if qm.IsAlarm {
		urlStr = fmt.Sprintf("%s/api/public/alarms?dateFrom=%s&dateTo=%s&varId=%s&locationPrefix=%s&pageIndex=%s&pageSize=%s",
		GlobalBaseUrl,
		url.QueryEscape(from),
		url.QueryEscape(to),
		url.QueryEscape(joinedVarIds),
		url.QueryEscape(qm.Prefix),                      
		url.QueryEscape(strconv.Itoa(pageIndex)),
		url.QueryEscape(strconv.Itoa(pageSize)),
)
		client := &http.Client{}
		req2, err := http.NewRequest("GET", urlStr, nil)
		if err != nil {
			log.DefaultLogger.Error("PLUGIN QUERY -- Failed to create HTTP request", "error", err)
			return backend.ErrDataResponse(backend.StatusInternal, "Failed to create API request")
		}

		req2.Header.Set("Authorization", config.Secrets.ApiKey)
		req2.Header.Set("Accept", "application/json")
		log.DefaultLogger.Info("PLUGIN QUERY -- HTTP headers set")

		resp, err := client.Do(req2)
		if err != nil {
			log.DefaultLogger.Error("PLUGIN QUERY -- HTTP request failed", "error", err)
			return backend.ErrDataResponse(backend.StatusBadGateway, "API request failed")
		}
		defer resp.Body.Close()

		log.DefaultLogger.Info("PLUGIN QUERY -- HTTP response received", "statusCode", resp.StatusCode)

		body, readErr := io.ReadAll(resp.Body)
		if readErr != nil {
			log.DefaultLogger.Error("PLUGIN QUERY -- Failed to read response body", "error", readErr)
			return backend.ErrDataResponse(backend.StatusInternal, "Failed to read API response")
		}

		limit := 300
		if len(body) < 300 {
			limit = len(body)
		}
		log.DefaultLogger.Info("PLUGIN QUERY -- Raw API response (first 300 chars)", "body", string(body[:limit]))

		if resp.StatusCode != http.StatusOK {
			log.DefaultLogger.Error("PLUGIN QUERY -- API returned non-OK status", "status", resp.StatusCode)
			return backend.ErrDataResponse(backend.StatusBadRequest, fmt.Sprintf("API Error (%d): %s", resp.StatusCode, string(body)))
		}

		var raw []AlarmLog
		if err := json.Unmarshal(body, &raw); err != nil {
			log.DefaultLogger.Error("PLUGIN QUERY -- JSON unmarshal response failed", "error", err)
			log.DefaultLogger.Error("PLUGIN QUERY -- Raw response body", "body", string(body))
			return backend.ErrDataResponse(backend.StatusInternal, "Failed to parse API response JSON")
		}

			frame := data.NewFrame(
			"Alarms",
			data.NewField("Description", nil, []string{}),
			data.NewField("Activation Time", nil, []time.Time{}),
			data.NewField("Termination Time", nil, []time.Time{}),
		)

		for _, alarm := range raw {
			var activation, termination time.Time
			var err error

			if alarm.IwsAlarmActivationTime != "" {
				activation, err = time.Parse("2006-01-02T15:04:05.999999", alarm.IwsAlarmActivationTime)
				if err != nil {
					log.DefaultLogger.Error("PLUGIN QUERY -- Time parse error", "field", "ActivationTime", "value", alarm.IwsAlarmActivationTime, "error", err)
				}
			}

			if alarm.IwsAlarmTerminationTime != "" {
				termination, err = time.Parse("2006-01-02T15:04:05.999999", alarm.IwsAlarmTerminationTime)
				if err != nil {
					log.DefaultLogger.Error("PLUGIN QUERY -- Time parse error", "field", "TerminationTime", "value", alarm.IwsAlarmTerminationTime, "error", err)
				}
			}

			frame.AppendRow(alarm.IwsAlarmDescription, activation, termination)
		}

		response.Frames = append(response.Frames, frame)
	}

	if qm.IsEvent {
		urlStr = fmt.Sprintf("%s/api/public/events?dateFrom=%s&dateTo=%s&varId=%s&locationPrefix=%s&opcTags=%s&pageIndex=%s&pageSize=%s",
			GlobalBaseUrl, 
			url.QueryEscape(from), 
			url.QueryEscape(to), 
			url.QueryEscape(joinedVarIds), 
			url.QueryEscape(qm.Prefix),
			url.QueryEscape(qm.OpcTags),
			url.QueryEscape(strconv.Itoa(pageIndex)), 
			url.QueryEscape(strconv.Itoa(pageSize)))
		log.DefaultLogger.Info("PLUGIN QUERY -- EVENT URL", "url", urlStr)
		
		client := &http.Client{}
		req2, err := http.NewRequest("GET", urlStr, nil)
		if err != nil {
			log.DefaultLogger.Error("PLUGIN QUERY -- Failed to create HTTP request", "error", err)
			return backend.ErrDataResponse(backend.StatusInternal, "Failed to create API request")
		}

		req2.Header.Set("Authorization", config.Secrets.ApiKey)
		req2.Header.Set("Accept", "application/json")
		log.DefaultLogger.Info("PLUGIN QUERY -- HTTP headers set")

		resp, err := client.Do(req2)
		if err != nil {
			log.DefaultLogger.Error("PLUGIN QUERY -- HTTP request failed", "error", err)
			return backend.ErrDataResponse(backend.StatusBadGateway, "API request failed")
		}
		defer resp.Body.Close()

		log.DefaultLogger.Info("PLUGIN QUERY -- HTTP response received", "statusCode", resp.StatusCode)

		body, readErr := io.ReadAll(resp.Body)
		if readErr != nil {
			log.DefaultLogger.Error("PLUGIN QUERY -- Failed to read response body", "error", readErr)
			return backend.ErrDataResponse(backend.StatusInternal, "Failed to read API response")
		}

		limit := 300
		if len(body) < 300 {
			limit = len(body)
		}
		log.DefaultLogger.Info("PLUGIN QUERY -- Raw API response (first 300 chars)", "body", string(body[:limit]))

		if resp.StatusCode != http.StatusOK {
			log.DefaultLogger.Error("PLUGIN QUERY -- API returned non-OK status", "status", resp.StatusCode)
			return backend.ErrDataResponse(backend.StatusBadRequest, fmt.Sprintf("API Error (%d): %s", resp.StatusCode, string(body)))
		}

		var raw []EventLog
		if err := json.Unmarshal(body, &raw); err != nil {
			log.DefaultLogger.Error("PLUGIN QUERY -- JSON unmarshal response failed", "error", err)
			log.DefaultLogger.Error("PLUGIN QUERY -- Raw response body", "body", string(body))
			return backend.ErrDataResponse(backend.StatusInternal, "Failed to parse API response JSON")
		}

			frame := data.NewFrame(
			"Events",
			data.NewField("Description", nil, []string{}),
			data.NewField("Activation Time", nil, []time.Time{}),
		)

		for _, event := range raw {
			var IwsEventTimestamp time.Time
			var err error

			if event.IwsEventTimestamp != "" {
				IwsEventTimestamp, err = time.Parse("2006-01-02T15:04:05.999999", event.IwsEventTimestamp)
				if err != nil {
					log.DefaultLogger.Error("PLUGIN QUERY -- Time parse error", "field", "IwsEventTimestamp", "value", event.IwsEventTimestamp, "error", err)
				}
			}

		

			frame.AppendRow(event.IwsEventDescription, IwsEventTimestamp)
		}

		response.Frames = append(response.Frames, frame)
	}

	if qm.IsLive && len(varIds) != 0 && varIds != nil {
			urlStr = fmt.Sprintf("%s/api/public/variables/getHistoryLoggedValuesV2?dateFrom=%s&dateTo=%s&varId=%s",
			GlobalBaseUrl, url.QueryEscape(from), url.QueryEscape(to), url.QueryEscape(joinedVarIds))
		log.DefaultLogger.Info("PLUGIN QUERY -- Final API URL", "url", urlStr)

		client := &http.Client{}
		req2, err := http.NewRequest("GET", urlStr, nil)
		if err != nil {
			log.DefaultLogger.Error("PLUGIN QUERY -- Failed to create HTTP request", "error", err)
			return backend.ErrDataResponse(backend.StatusInternal, "Failed to create API request")
		}

		req2.Header.Set("Authorization", config.Secrets.ApiKey)
		req2.Header.Set("Accept", "application/json")
		log.DefaultLogger.Info("PLUGIN QUERY -- HTTP headers set")

		resp, err := client.Do(req2)
		if err != nil {
			log.DefaultLogger.Error("PLUGIN QUERY -- HTTP request failed", "error", err)
			return backend.ErrDataResponse(backend.StatusBadGateway, "API request failed")
		}
		defer resp.Body.Close()

		log.DefaultLogger.Info("PLUGIN QUERY -- HTTP response received", "statusCode", resp.StatusCode)

		body, readErr := io.ReadAll(resp.Body)
		if readErr != nil {
			log.DefaultLogger.Error("PLUGIN QUERY -- Failed to read response body", "error", readErr)
			return backend.ErrDataResponse(backend.StatusInternal, "Failed to read API response")
		}

		limit := 300
		if len(body) < 300 {
			limit = len(body)
		}
		log.DefaultLogger.Info("PLUGIN QUERY -- Raw API response (first 300 chars)", "body", string(body[:limit]))

		if resp.StatusCode != http.StatusOK {
			log.DefaultLogger.Error("PLUGIN QUERY -- API returned non-OK status", "status", resp.StatusCode)
			return backend.ErrDataResponse(backend.StatusBadRequest, fmt.Sprintf("API Error (%d): %s", resp.StatusCode, string(body)))
		}

		var raw []rawLiveValue
		if err := json.Unmarshal(body, &raw); err != nil {
			log.DefaultLogger.Error("PLUGIN QUERY -- JSON unmarshal response failed", "error", err)
			log.DefaultLogger.Error("PLUGIN QUERY -- Raw response body", "body", string(body))
			return backend.ErrDataResponse(backend.StatusInternal, "Failed to parse API response JSON")
		}

		log.DefaultLogger.Info("PLUGIN QUERY -- Parsed records", "count", len(raw))

		grouped := make(map[int][]LiveValueTimeseries)
		for _, r := range raw {
			t, err := time.Parse("2006-01-02T15:04:05", r.Timestamp)
			if err != nil {
				log.DefaultLogger.Error("PLUGIN QUERY -- Time parse error", "timestamp", r.Timestamp, "error", err)
				continue
			}
			grouped[r.VariableId] = append(grouped[r.VariableId], LiveValueTimeseries{
				Timestamp: t,
				Value:     r.Value,
			})
		}

		for varId, values := range grouped {
			log.DefaultLogger.Info("PLUGIN QUERY -- Grouped values", "VariableId", varId, "Count", len(values))
			maxSamples := 3
			for i, v := range values {
				if i >= maxSamples {
					log.DefaultLogger.Info("PLUGIN QUERY -- Skipping remaining values for VarId", "VariableId", varId)
					break
				}
				log.DefaultLogger.Info("PLUGIN QUERY -- Sample value", "VariableId", varId, "Timestamp", v.Timestamp.Format("2006-01-02 15:04:05"), "Value", v.Value)
			}
		}

		for varId, values := range grouped {
				var varName string
				for _, v := range qm.Variables {
					if v.ID == varId {
						varName = v.VariableName
						break
					}
				}

				if varName == "" {
					varName = fmt.Sprintf("%d", varId)
				}

				frame := data.NewFrame(varName)

				times := make([]time.Time, len(values))
				vals := make([]float64, len(values))
				for i, v := range values {
					times[i] = v.Timestamp
					vals[i] = v.Value
				}

				frame.Fields = append(frame.Fields,
					data.NewField("time", nil, times),
					data.NewField("value", nil, vals),
				)

				response.Frames = append(response.Frames, frame)
			}
	}

	log.DefaultLogger.Info("PLUGIN QUERY -- END --------------------------------")
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

		if values.Get("page") == "" {
			values.Set("page", "0")
		}
		if values.Get("itemsPerPage") == "" {
			values.Set("itemsPerPage", "20")
		}
		if values.Get("skipFilterConns") == "" {
			values.Set("skipFilterConns", "false")
		}
		if values.Get("connId") == "" {
			values.Set("connId", "0")
		}
		if values.Get("likeParam") == "" {
			values.Set("likeParam", "")
		}

		if values.Get("skipPagination") == "" {
			values.Set("skipPagination", "true")
		}

		baseURL, _ := url.Parse(GlobalBaseUrl + "/api/public/variables-dto")

		log.DefaultLogger.Info("PLUGIN QUERY -- BaseUrl", "url", GlobalBaseUrl)

		baseURL.RawQuery = values.Encode()

		client := &http.Client{}
		req, err := http.NewRequest("GET", baseURL.String(), nil)
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

		u, _ := url.Parse(req.URL)
		values := u.Query()

		if values.Get("pageIndex") == "" {
			values.Set("pageIndex", "0")
		}
		if values.Get("pageSize") == "" {
			values.Set("pageSize", "10")
		}
		if values.Get("skipConnectionFilter") == "" {
			values.Set("skipConnectionFilter", "false")
		}

		baseURL, _ := url.Parse(GlobalBaseUrl + "/api/public/connections")
		baseURL.RawQuery = values.Encode()

		client := &http.Client{}
		req, err := http.NewRequest("GET", baseURL.String(), nil)
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

	return sender.Send(&backend.CallResourceResponse{

		Status: http.StatusNotFound,

		Body: []byte(fmt.Sprintf("Unknown path: %s", req.Path)),
	})

}
