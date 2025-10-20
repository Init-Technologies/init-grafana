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
	VariableId int     `json:"VariableId"`
    Value      float64 `json:"Value"`
    Timestamp  string  `json:"timestamp"`
    Quality    int     `json:"quality"`
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
	QueryText      string  `json:"queryText"`
	Constant       float64 `json:"constant"`

	ConnectionId   *int    `json:"connectionId"`
	ConnectionText string  `json:"connectionText"`
	VariableId     *int    `json:"variableId"`
	VariableText   string  `json:"variableText"`
	IsLive		   bool    `json:"isLive"`
	IsAlarm        bool    `json:"isAlarm"`
	IsEvent        bool    `json:"isEvent"`

 	Prefix         string `json:"prefix"`
    Suffix         string `json:"suffix"`

	PageIndex      int     `json:"pageIndex"`
	PageSize       int     `json:"pageSize"`

	VariableIds     []int    `json:"variableIds"`
	VariableNames   []string  `json:"variableNames"`
}


type AlarmLog struct {
	IwsAlarmDescription      string `json:"iwsAlarmDescription"`
	IwsAlarmActivationTime   string `json:"iwsAlarmActivationTime"`
	IwsAlarmTerminationTime  string `json:"iwsAlarmTerminationTime"`
}

type EventLog struct {
	IwsEventDescription      string `json:"iwsEventDescription"`
	IwsEventTimestamp   string `json:"iwsEventTimestamp"`
}

