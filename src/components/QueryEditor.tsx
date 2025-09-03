import React, { ChangeEvent, useEffect, useState } from 'react';
import { AsyncSelect, Button, InlineField, Input, Stack } from '@grafana/ui';
import { QueryEditorProps } from '@grafana/data';
import { DataSource } from '../datasource';
import { MyDataSourceOptions, MyQuery } from '../types';
import { getBackendSrv, getTemplateSrv } from '@grafana/runtime';
import { lastValueFrom } from 'rxjs';
import { VariableSelector, VariableType } from './VariableSelector';
import { ConnectionSelector, ConnectionType } from './ConnectionSelector';

type Props = QueryEditorProps<DataSource, MyQuery, MyDataSourceOptions>;



export function QueryEditor({ datasource ,query, onChange, onRunQuery }: Props) {




  const [selectedConnId, setSelectedConnId] = useState<number | null>(null);
  const [connections1, setConnections] = useState<ConnectionType[]>([]);
  const [variables1, setVariables] = useState<VariableType[]>([]);

  useEffect(() => {
    ConnectionApiGet(true,"");
  }, []);

  useEffect(() => {
    if (selectedConnId !== null) {
      VariablesApiGet(selectedConnId,false,"");
    }else
    {
      VariablesApiGet(0,true,"");
    }
}, [selectedConnId]);


  const onVariableChange = (value: any) => {
    onChange({ ...query, queryText: value });
    onRunQuery();
  };


  const onConnectionChange = (value: any) => {
    setSelectedConnId(value);

  };

  const onTextConnectionChange = (value: string) => {
    const skipFilter = value === ""; 
  
    ConnectionApiGet(skipFilter, value);
  
    if (skipFilter) {
      setSelectedConnId(null); 
    }
  };

  const onTextCVariableChange = (value: string) => {
    const connId = selectedConnId ?? 0;      // use 0 if selectedConnId is null
    const skipFilter = selectedConnId === null; // skip if no connection selected
  
    VariablesApiGet(connId, skipFilter, value);
  };


  async function VariablesApiGet(connId: number,skipConnectionFilter : boolean, textChange : string) { 
    try { 
      const uid = datasource.uid; 
      const endpointUrl = `/api/datasources/uid/${uid}/resources/Variables` +
      `?connId=${connId}` +
      `&skipFilterConns=${encodeURIComponent(String(skipConnectionFilter))}` +
      `&likeParam=${encodeURIComponent(textChange)}` +
      `&page=0&itemsPerPage=20`;
  
  
      const fetch = await getBackendSrv().fetch<VariableType[]>({ 

        url: endpointUrl,  method: 'GET', 

      }); 

      const response = await lastValueFrom(fetch); 

      setVariables(response.data)

    
  
      return response.data; 
    } catch (error) { 
      throw error; 
    } 
  }
  

  async function ConnectionApiGet(skipConnectionFilter : boolean, textChange : string) { 
    try { 
      const uid = datasource.uid; 
      
      const endpointUrl = `/api/datasources/uid/${uid}/resources/Connections` +
      `?skipConnectionFilter=${encodeURIComponent(String(skipConnectionFilter))}` +
      `&searchText=${encodeURIComponent(textChange)}` +
      `&pageIndex=0&pageSize=10`;
  
  
      const fetch = await getBackendSrv().fetch<ConnectionType[]>({ 

        url: endpointUrl,  method: 'GET', 

      }); 

      const response = await lastValueFrom(fetch); 

      setConnections(response.data)

    
  
      return response.data; 
    } catch (error) { 
      throw error; 
    } 
  }


  return (
    <Stack direction="column" gap={1}>


    {connections1.length > 0 ? (
      <div className="gf-form-group">
        <ConnectionSelector
          value={''} // default selected
          onChange={(value) => onConnectionChange(value)}
          onTextChange={(value) => onTextConnectionChange(value)}
          connections={connections1}
          onRunQuery={onRunQuery}
        />
      </div>
    ) : (
      <div>Loading Connections...</div>
    )}

    {variables1.length > 0 ? (
      <div className="gf-form-group">
        <VariableSelector
          value={''} // default selected
          onChange={(value) => onVariableChange(value)}
          onTextChange={(value) => onTextCVariableChange(value)}
          variables={variables1}
          onRunQuery={onRunQuery}
        />
      </div>
    ) : (
      <div>Loading Variables...</div>
    )}


   
  </Stack>

    
  );
}

