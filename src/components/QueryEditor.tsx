import React, { useEffect, useState } from 'react';
import { Stack, InlineField, Input, Select, Button, RadioButtonGroup } from '@grafana/ui';
import { QueryEditorProps } from '@grafana/data';
import { DataSource } from '../datasource';
import { MyDataSourceOptions, MyQuery } from '../types';
import { getBackendSrv } from '@grafana/runtime';
import { lastValueFrom } from 'rxjs';
import { VariableSelector, VariableType } from './VariableSelector';
import { ConnectionSelector, ConnectionType } from './ConnectionSelector';

type Props = QueryEditorProps<DataSource, MyQuery, MyDataSourceOptions>;

export function QueryEditor({ datasource, query, onChange, onRunQuery }: Props) {
  const [connections, setConnections] = useState<ConnectionType[]>(query.connections ?? []);
  const [selectedConnId, setSelectedConnId] = useState<number | null>(query.connectionId ?? null);
  const [selectedConnText, setSelectedConnText] = useState<string>(query.connectionText ?? '');

  const [selectedVariable, setSelectedVariable] = useState<string>(query.queryText ?? ''); 
  const [variables, setVariables] = useState<VariableType[]>([]);

  const [type, setType] = useState<'Alarm' | 'Event' | 'Live'>(
    query.isAlarm ? 'Alarm' : query.isEvent ? 'Event' : query.isLive ? 'Live' : 'Live'
  );
  const [prefix, setPrefix] = useState(query.prefix ?? '');
  const [opcTags, setOpcTags] = useState(query.opcTags ?? '');
  const [pageIndex, setPageIndex] = useState(query.pageIndex ?? 0);
  const [pageSize, setPageSize] = useState(query.pageSize ?? 20);

  useEffect(() => {
    onChange({
      ...query,
      connections,
      connectionId: selectedConnId,
      connectionText: selectedConnText,
    });
  }, [connections, selectedConnId, selectedConnText]);

  useEffect(() => {
      const updatedQuery = {
      ...query,
      isAlarm: type === 'Alarm',
      isEvent: type === 'Event',
      isLive: type === 'Live',
      prefix : prefix,
      opcTags : opcTags,
      pageIndex : pageIndex,
      pageSize : pageSize,
      variables : variables
    };

  onChange({ ...updatedQuery }); 
  
  onRunQuery();
  }, [type, prefix, opcTags, pageIndex, pageSize,variables]);

  useEffect(() => {
    if (connections.length === 0) {
      ConnectionApiGet(true, '');
    }
  }, []);

  useEffect(() => {
    const skipConnFilter = selectedConnId === null;
    const connId = selectedConnId ?? 0;
    VariablesApiGet(connId, skipConnFilter, '', true);

    onRunQuery();
  }, [selectedConnId]);

  useEffect(() => {
    console.log('Selected Connection ID:', selectedConnId);
    console.log('Selected Variable:', selectedVariable);
    console.log('Selected Connection Text:', selectedConnText);
  }, [selectedConnId, selectedVariable, selectedConnText]);


  const onVariableChange = (selectedVars: VariableType[]) => {
    const ids = selectedVars.map(v => v.id);
    const idsString = ids.join(',');
    setSelectedVariable(idsString);

    onChange({
      ...query,
      queryText: idsString, 
      variables: selectedVars
    });
    onRunQuery(); 
  };

  const onConnectionChange = (id: number | null, name?: string) => {
    setSelectedConnId(id);
    setSelectedConnText(name ?? '');
    onChange({
      ...query,
      connectionId: id,
      connectionText: name ?? '',
    });
    onRunQuery();
  };

  const onTextConnectionChange = (value: string) => {
    const skipFilter = value === '';
    ConnectionApiGet(skipFilter, value).then(setConnections);

    if (skipFilter) {
      setSelectedConnId(null);
      setSelectedConnText('');
      onChange({ ...query, connectionId: null, connectionText: '' });
    }
  };
  
const onTextVariableChange = async (value: string) => {
  const connId = selectedConnId ?? 0;
  const skipFilter = selectedConnId === null;
  const skipPagination = value.trim() === '' && selectedConnId === null;
  const newVars = await VariablesApiGet(connId, skipFilter, value, skipPagination);

  setVariables(prev => {
    const merged = [...prev];
    for (const v of newVars) {
      if (!merged.some(m => m.id === v.id)) merged.push(v);
    }
    return merged;
  });
};



  async function VariablesApiGet(
    connId: number,
    skipConnectionFilter: boolean,
    textChange: string,
    skipPagination: boolean = false
  ) {
    try {
      const uid = datasource.uid;
      const endpointUrl =
        `/api/datasources/uid/${uid}/resources/Variables` +
        `?connId=${connId}` +
        `&skipFilterConns=${encodeURIComponent(String(skipConnectionFilter))}` +
        `&likeParam=${encodeURIComponent(textChange)}` +
        `&page=0&itemsPerPage=20` +
        `&skipPagination=${encodeURIComponent(String(skipPagination))}`;

      const fetch = await getBackendSrv().fetch<VariableType[]>({
        url: endpointUrl,
        method: 'GET',
      });

      const response = await lastValueFrom(fetch);
      setVariables(response.data);
      return response.data;
    } catch (error) {
      console.error('Variable API error:', error);
      throw error;
    }
  }

  async function ConnectionApiGet(skipConnectionFilter: boolean, textChange: string) {
    try {
      const uid = datasource.uid;
      const endpointUrl =
        `/api/datasources/uid/${uid}/resources/Connections` +
        `?skipConnectionFilter=${encodeURIComponent(String(skipConnectionFilter))}` +
        `&searchText=${encodeURIComponent(textChange)}` +
        `&pageIndex=0&pageSize=10`;

      const fetch = await getBackendSrv().fetch<ConnectionType[]>({
        url: endpointUrl,
        method: 'GET',
      });

      const response = await lastValueFrom(fetch);
      setConnections(response.data);
      return response.data;
    } catch (error) {
      console.error('Connection API error:', error);
      throw error;
    }
  }

  const selectedVariableIds = selectedVariable
    ? selectedVariable.split(',').map(s => parseInt(s, 10)).filter(n => !isNaN(n))
    : [];

  return (
    <Stack direction="column" gap={1}>
      {connections.length > 0 ? (
        <div className="gf-form-group">
          <ConnectionSelector
            value={selectedConnId}
            onChange={onConnectionChange}
            onTextChange={onTextConnectionChange}
            connections={connections}
          />
        </div>
      ) : (
        <div>Loading Connections...</div>
      )}

      {variables.length > 0 ? (
        <div className="gf-form-group">
          <VariableSelector
            value={selectedVariableIds}
            onChange={onVariableChange}
            onTextChange={onTextVariableChange}
            variables={variables}
            onRunQuery={onRunQuery}
          />
        </div>
      ) : (
        <div>Loading Variables...</div>
      )}

      {/* Alarm/Event Type */}
      <InlineField label="Type" labelWidth={14}>
        <RadioButtonGroup<'Alarm' | 'Event' | 'Live'>
          options={[
            { label: 'Live', value: 'Live' },
            { label: 'Alarm', value: 'Alarm' },
            { label: 'Event', value: 'Event' },
          ]}
          value={type}
          onChange={(v) => setType(v)}
        />
      </InlineField>

      {/* Prefix */}
      <InlineField label="Prefix" labelWidth={22}>
        <Input
          value={prefix}
          onChange={(e) => setPrefix(e.currentTarget.value)}
          placeholder="Enter prefix..."
          width={50}
        />
      </InlineField>

      {/* Suffix */}
      <InlineField label="OpcTags" labelWidth={22}>
        <Input
          value={opcTags}
          onChange={(e) => setOpcTags(e.currentTarget.value)}
          placeholder="Enter OpcTags eg. (tag1,tag2,tag3)"
          width={50}
        />
      </InlineField>

      {/* Pagination */}
      <Stack direction="row" gap={1}>
        <Button
          variant="secondary"
          icon="angle-left"
          disabled={pageIndex === 0}
          onClick={() => {
            setPageIndex((prev) => Math.max(prev - 1, 0));
          }}
        />

        <InlineField label="Page" labelWidth={6}>
          <Input
            type="number"
            value={pageIndex + 1}
            min={1}
            onChange={(e) => {
              const newPage = Number(e.currentTarget.value) - 1;
              setPageIndex(newPage >= 0 ? newPage : 0);
            }}
            width={12}
          />
        </InlineField>

        <Button
          variant="secondary"
          icon="angle-right"
          onClick={() => {
            setPageIndex((prev) => prev + 1);
          }}
        />

        <InlineField label="Rows" labelWidth={6}>
          <Select
            options={[
              { label: '10', value: 10 },
              { label: '20', value: 20 },
              { label: '50', value: 50 },
              { label: '100', value: 100 },
            ]}
            value={pageSize}
            onChange={(v) => {
              setPageSize(v.value!);
              setPageIndex(0);
            }}
            width={12}
          />
        </InlineField>
      </Stack>
    </Stack>
  );
}
