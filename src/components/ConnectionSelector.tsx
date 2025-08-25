import React from 'react';
import { AsyncSelect, InlineField } from '@grafana/ui';
import { SelectableValue } from '@grafana/data';


export interface ConnectionType {
  id: number;
  name: string;
}


interface ConnectionSelectorProps {
  value?:  string | null; // Now handles both id (number) and custom values (string)
  onChange: (value: number | string) => void; // Returns either the id or custom value
  onRunQuery?: () => void;
  connections?: ConnectionType[]; // Your API response structure
  width?: number;
  label?: string;
  tooltip?: string;
  allowCustomValue?: boolean;
  placeholder?: string;
}

export const ConnectionSelector: React.FC<ConnectionSelectorProps> = ({
  value,
  onChange,
  onRunQuery = () => {},
  connections = [],
  width = 40,
  label = 'Connection',
  tooltip = 'Select a connection or enter custom value',
  allowCustomValue = true,
  placeholder = 'Select or type a value...',
}) => {
  // Convert variables to SelectableValue options
  const connectionOptions = connections.map(connection => ({
    label: connection.name,
    value: connection.id.toString(), // Convert to string for consistent handling
    original: connection // Keep reference to original data
  }));

  // Find the current selected option
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
      // Pass the ID as a number when selecting from dropdown
      onChange(selected.value);
    } else {
      // Clear selection
      onChange('');
    }
    onRunQuery();
  };

  const handleCreateOption = (newValue: string) => {
    // For custom values, pass the string directly
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
      />
    </InlineField>
  );
};