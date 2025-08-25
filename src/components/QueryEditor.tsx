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
    ConnectionApiGet();
  }, []);

  // Fetch variables when selectedConnId changes
useEffect(() => {
  if (selectedConnId !== null) {
    VariablesApiGet(selectedConnId);
  }else
  {
    VariablesApiGet(0);
  }
}, [selectedConnId]);

  useEffect(() => {
    if (variables1.length > 0) {
      variables1.forEach((variable, index) => {
     //   console.info(`Variable from state ${index + 1}:`, variable);
      });
    }
  }, [variables1]);


  useEffect(() => {
    if (connections1.length > 0) {
      connections1.forEach((connection, index) => {
      //  console.info(`Connection from state ${index + 1}:`, connection);
      });
    }
  }, [connections1]);


  const onVariableChange = (value: any) => {
    onChange({ ...query, queryText: value });
    onRunQuery();
  };

  // onVariableChange("12345");

  const onConnectionChange = (value: any) => {
    setSelectedConnId(value);

  };

  async function VariablesApiGet(connId: number) { 
    try { 
      const uid = datasource.uid; 
      const endpointUrl = `/api/datasources/uid/${uid}/resources/Variables?connId=${connId}`; 
  
    //  console.info("Full endpoint URL:", endpointUrl); 
  
      const fetch = await getBackendSrv().fetch<VariableType[]>({ 

        url: endpointUrl,  method: 'GET', 

      }); 

      const response = await lastValueFrom(fetch); 

      setVariables(response.data)

      variables1.forEach((variable, index) => {
      //  console.info(`New Variable 1 ${index + 1}:`, variable);
      });


      console.info('Variables response:', response.data); 
 // Loop through each variable and log
      response.data.forEach((variable, index) => {
          //  console.info(`Variable ${index + 1}:`, variable);
          });

  
      return response.data; // return the actual data
    } catch (error) { 
     // console.error('Error calling custom endpoint:', error); 
      throw error; 
    } 
  }
  

  async function ConnectionApiGet() { 
    try { 
      const uid = datasource.uid; 
      const endpointUrl = `/api/datasources/uid/${uid}/resources/Connections`; 
  
    //  console.info("Full endpoint URL:", endpointUrl); 
  
      const fetch = await getBackendSrv().fetch<ConnectionType[]>({ 

        url: endpointUrl,  method: 'GET', 

      }); 

      const response = await lastValueFrom(fetch); 

      setConnections(response.data)

      connections1.forEach((connection, index) => {
      //  console.info(`New Connection 1 ${index + 1}:`, connection);
      });


    //  console.info('Connection response:', response.data); 
 // Loop through each variable and log
      response.data.forEach((connection, index) => {
     //       console.info(`Connection ${index + 1}:`, connection);
          });

  
      return response.data; // return the actual data
    } catch (error) { 
   //   console.error('Error calling custom endpoint:', error); 
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

