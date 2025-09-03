package plugin

import "time"


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

var errResp struct {
	Errors  map[string][]string `json:"errors"`
	Type    string              `json:"type"`
	Title   string              `json:"title"`
	Status  int                 `json:"status"`
	TraceId string              `json:"traceId"`
}

type queryModel struct {
	QueryText string `json:"queryText"`
}
