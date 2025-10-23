import { DataSourceInstanceSettings, CoreApp, ScopedVars } from '@grafana/data';
import { DataSourceWithBackend, getTemplateSrv } from '@grafana/runtime';

import { MyQuery, MyDataSourceOptions, DEFAULT_QUERY } from './types';

export class DataSource extends DataSourceWithBackend<MyQuery, MyDataSourceOptions> {
  constructor(instanceSettings: DataSourceInstanceSettings<MyDataSourceOptions>) {
    super(instanceSettings);
  }

  getDefaultQuery(_: CoreApp): Partial<MyQuery> {
    return DEFAULT_QUERY;
  }

  applyTemplateVariables(query: MyQuery, scopedVars: ScopedVars) {
    return {
      ...query,
      queryText: getTemplateSrv().replace(query.queryText, scopedVars),
    };
  }

filterQuery(query: MyQuery): boolean {
  if (query.isLive && (!query.queryText || query.queryText === '')) {
    return false;
  }
  
  return (
    query.queryText !== undefined ||
    query.isLive !== undefined ||
    query.isAlarm !== undefined ||
    query.isEvent !== undefined ||
    query.prefix !== undefined ||
    query.opcTags !== undefined ||
    query.pageIndex !== undefined ||
    query.pageSize !== undefined
  );
}
}
