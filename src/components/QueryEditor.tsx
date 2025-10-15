import React, { useEffect, useState } from 'react';
import { Stack } from '@grafana/ui';
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
  const [selectedVariable, setSelectedVariable] = useState<string>(''); // ✅ new state
  const [connections, setConnections] = useState<ConnectionType[]>([]);
  const [variables, setVariables] = useState<VariableType[]>([]);

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

  const onConnectionChange = (value: any) => {
    setSelectedConnId(value);
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
            value={''}
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
    </Stack>
  );
}
