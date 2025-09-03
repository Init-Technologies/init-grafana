import React from 'react';
import { AsyncSelect, InlineField } from '@grafana/ui';
import { SelectableValue } from '@grafana/data';


export interface ConnectionType {
  id: number;
  name: string;
}


interface ConnectionSelectorProps {
  value?:  string | null; 
  onChange: (value: number | string) => void; 
  onTextChange: (value: string) => void;
  onRunQuery?: () => void;
  connections?: ConnectionType[]; 
  width?: number;
  label?: string;
  tooltip?: string;
  allowCustomValue?: boolean;
  placeholder?: string;
}

export const ConnectionSelector: React.FC<ConnectionSelectorProps> = ({
  value,
  onChange,
  onTextChange,
  onRunQuery = () => {},
  connections = [],
  width = 40,
  label = 'Connection',
  tooltip = 'Select a connection or enter custom value',
  allowCustomValue = true,
  placeholder = 'Select or type a value...',
}) => {
  const connectionOptions = connections.map(connection => ({
    label: connection.name,
    value: connection.id.toString(), 
    original: connection 
  }));

  const selectedOption = connectionOptions.find(opt => opt.value === value?.toString()) || 
    (value && allowCustomValue ? { label: value.toString(), value: value.toString() } : null);

  const loadOptions = async (inputValue: string): Promise<Array<SelectableValue<string>>> => {
    return new Promise(resolve => {
      if (!inputValue) {
        resolve(connectionOptions);
        return;
      }
      
      const filtered = connectionOptions.filter(option =>
        option.label.toLowerCase().includes(inputValue.toLowerCase()) ||
        option.value.toLowerCase().includes(inputValue.toLowerCase())
      );
      resolve(filtered);
    });
  };

  const handleChange = (selected: SelectableValue<string>) => {
    if (selected?.value) {
      onChange(selected.value);
    } else {
      onChange('');
      onTextChange("");            
    }
    onRunQuery();
  };

  const handleInputChange = (inputValue: string, { action }: { action: string }) => {
    if (action === 'input-change') {
      console.log('User typed:', inputValue);
      onTextChange(inputValue);
    }
    return inputValue;
  };
  
  

  const handleCreateOption = (newValue: string) => {
    onChange(newValue);
    onRunQuery();
  };

  return (
    <InlineField label={label} labelWidth={16} tooltip={tooltip}>
      <AsyncSelect
        defaultOptions
        loadOptions={loadOptions}
        value={selectedOption}
        onChange={handleChange}
        allowCustomValue={allowCustomValue}
        placeholder={placeholder}
        width={width}
        loadingMessage="Loading connections..."
        noOptionsMessage="No connections found"
        isClearable
        onCreateOption={handleCreateOption}
        onInputChange={handleInputChange} 
      />
    </InlineField>
  );
};