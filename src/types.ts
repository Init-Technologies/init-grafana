import { DataSourceJsonData } from '@grafana/data';
import { DataQuery } from '@grafana/schema';
import { ConnectionType } from 'components/ConnectionSelector';
import { VariableType } from 'components/VariableSelector';

export interface MyQuery extends DataQuery {
  queryText?: string;
  constant: number;

  connectionId?: number | null;
  connectionText?: string;
  variableId?: number | null;
  variableText?: string;
  isLive : boolean;
  isAlarm : boolean;
  isEvent : boolean;
  prefix: string;
  opcTags: string;
  pageIndex: number;
  pageSize: number;
  connections?: ConnectionType[];


  variableIds : number[];
  variableNames : string[];
  variables : VariableType[];

}

export const DEFAULT_QUERY: Partial<MyQuery> = {
  constant: 6.5,
};

export interface DataPoint {
  Time: number;
  Value: number;
}

export interface DataSourceResponse {
  datapoints: DataPoint[];
}

/**
 * These are options configured for each DataSource instance
 */
export interface MyDataSourceOptions extends DataSourceJsonData {
  path?: string;
  baseUrl?: string;   // ✅ Add this
}

/**
 * Value that is used in the backend, but never sent over HTTP to the frontend
 */
export interface MySecureJsonData {
  apiKey?: string;
}
