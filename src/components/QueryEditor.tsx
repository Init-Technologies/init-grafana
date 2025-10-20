import React, { useEffect, useState } from 'react';
import { Stack, InlineField, Input, Select,Button, RadioButtonGroup } from '@grafana/ui';
import { QueryEditorProps } from '@grafana/data';
import { DataSource } from '../datasource';
import { MyDataSourceOptions, MyQuery } from '../types';
import { getBackendSrv } from '@grafana/runtime';
import { lastValueFrom } from 'rxjs';
import { VariableSelector, VariableType } from './VariableSelector';
import { ConnectionSelector, ConnectionType } from './ConnectionSelector';

type Props = QueryEditorProps<DataSource, MyQuery, MyDataSourceOptions>;

export function QueryEditor({ datasource, query, onChange, onRunQuery }: Props) {
  const [selectedConnId, setSelectedConnId] = useState<number | null>(null);
  const [selectedVariable, setSelectedVariable] = useState<string>(''); 
  const [connections, setConnections] = useState<ConnectionType[]>([]);
  const [variables, setVariables] = useState<VariableType[]>([]);


 const [type, setType] = useState<'Alarm' | 'Event' | 'Live'>(
  query.isAlarm ? 'Alarm' : query.isEvent ? 'Event' : query.isLive ? 'Live' : 'Live'
);
  const [prefix, setPrefix] = useState(query.prefix ?? '');
  const [suffix, setSuffix] = useState(query.suffix ?? '');
  const [pageIndex, setPageIndex] = useState(query.pageIndex ?? 0);
  const [pageSize, setPageSize] = useState(query.pageSize ?? 20);



  useEffect(() => {
    onChange({
      ...query,
      isAlarm: type === 'Alarm',
      isEvent: type === 'Event',
      isLive: type === 'Live',
      prefix,
      suffix,
      pageIndex,
      pageSize,
    });

    onRunQuery();
  }, [type, prefix, suffix, pageIndex, pageSize]);



  useEffect(() => {

    if(selectedConnId === null && selectedVariable == '')
    {

      ConnectionApiGet(true, '');
      VariablesApiGet(-1, true, '', true);
    }
    else
    {
        if (selectedConnId !== null) {
        VariablesApiGet(selectedConnId, false, '');
        } else {
        VariablesApiGet(0, true, '');
      }
    }

  }, [selectedConnId]);
  useEffect(() => {
    console.log('Selected Connection ID:', selectedConnId);
    console.log('Selected Variable:', selectedVariable);
  }, [selectedConnId, selectedVariable]);


  const onVariableChange = (value: any) => {
    setSelectedVariable(value); // ✅ update state
    onChange({ ...query, queryText: value });
    onRunQuery();
  };

 const onConnectionChange = (id: number | null, name?: string) => {
  setSelectedConnId(id);
  onChange({
    ...query,
    connectionId: id,
    connectionText: name ?? '',
  });
  onRunQuery();
};

  const onTextConnectionChange = (value: string) => {
    const skipFilter = value === '';
    ConnectionApiGet(skipFilter, value);
    if (skipFilter) {
      setSelectedConnId(null);
    }
  };

  const onTextVariableChange = (value: string) => {
    const connId = selectedConnId ?? 0;
    const skipFilter = selectedConnId === null;

    const skipPagination = value.trim() === '' && selectedConnId === null;

    VariablesApiGet(connId, skipFilter, value, skipPagination);
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

  return (
    <Stack direction="column" gap={1}>
      {connections.length > 0 ? (
        <div className="gf-form-group">
         <ConnectionSelector
        value={selectedConnId}
        onChange={onConnectionChange}
        onTextChange={onTextConnectionChange}
        connections={connections}
        onRunQuery={onRunQuery}
      />
        </div>
      ) : (
        <div>Loading Connections...</div>
      )}

      {variables.length > 0 ? (
        <div className="gf-form-group">
          <VariableSelector
            value={''}
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
  <InlineField label="Prefix" labelWidth={14}>
    <Input
      value={prefix}
      onChange={(e) => setPrefix(e.currentTarget.value)}
      placeholder="Enter prefix..."
      width={25}
    />
  </InlineField>

  {/* Suffix */}
  <InlineField label="Suffix" labelWidth={14}>
    <Input
      value={suffix}
      onChange={(e) => setSuffix(e.currentTarget.value)}
      placeholder="Enter suffix..."
      width={25}
    />
  </InlineField>

<Stack direction="row" gap={1}>
  {/* Previous Button */}
  <Button
    variant="secondary"
    icon="angle-left"
    disabled={pageIndex === 0}
    onClick={() => {
      const newIndex = pageIndex - 1;
      setPageIndex(newIndex);
      onRunQuery();
    }}
  />

  {/* Current Page Input */}
  <InlineField label="Page" labelWidth={6}>
    <Input
      type="number"
      value={pageIndex + 1} 
      min={1}
      onChange={(e) => {
        const newPage = Number(e.currentTarget.value) - 1;
        setPageIndex(newPage >= 0 ? newPage : 0);
        onRunQuery();
      }}
      width={12}
    />
  </InlineField>

  {/* Next Button */}
  <Button
    variant="secondary"
    icon="angle-right"
    onClick={() => {
      const newIndex = pageIndex + 1;
      setPageIndex(newIndex);
      onRunQuery();
    }}
  />

  {/* Page Size Dropdown */}
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
        onRunQuery();
      }}
      width={12}
    />
  </InlineField>
</Stack>
    </Stack>

    
  );
}
