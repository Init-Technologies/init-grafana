import React, { useMemo } from 'react';
import { AsyncSelect, InlineField } from '@grafana/ui';
import { SelectableValue } from '@grafana/data';

export interface VariableType {
  id: number;
  variableName: string;
}

interface VariableSelectorProps {
  value?: string | null;
  onChange: (value: number | string) => void;
  onRunQuery?: () => void;
  variables?: VariableType[];
  width?: number;
  label?: string;
  tooltip?: string;
  allowCustomValue?: boolean;
  placeholder?: string;
}

export const VariableSelector: React.FC<VariableSelectorProps> = ({
  value,
  onChange,
  onRunQuery = () => {},
  variables = [],
  width = 40,
  label = 'Variable',
  tooltip = 'Select a variable or enter custom value',
  allowCustomValue = true,
  placeholder = 'Select or type a value...',
}) => {
  // Convert variables to SelectableValue options - useMemo to prevent recreation on every render
  const variableOptions = useMemo(() => {
    console.log("Variables updated:", variables);
    return variables.map(variable => ({
      label: variable.variableName,
      value: variable.id.toString(),
      original: variable
    }));
  }, [variables]); // Recreate only when variables change

  // Find the current selected option
  const selectedOption = useMemo(() => {
    return variableOptions.find(opt => opt.value === value?.toString()) || 
      (value && allowCustomValue ? { label: value.toString(), value: value.toString() } : null);
  }, [variableOptions, value, allowCustomValue]);

  const loadOptions = React.useCallback(async (inputValue: string): Promise<Array<SelectableValue<string>>> => {
    console.log("Loading options for input:", inputValue, "with", variableOptions.length, "variables");
    
    if (!inputValue) {
      return variableOptions;
    }
    
    const filtered = variableOptions.filter(option =>
      option.label.toLowerCase().includes(inputValue.toLowerCase()) ||
      option.value.toLowerCase().includes(inputValue.toLowerCase())
    );
    
    return filtered;
  }, [variableOptions]); // Now depends on the latest variableOptions

  const handleChange = React.useCallback((selected: SelectableValue<string>) => {
    console.log("Selection changed:", selected);
    
    if (selected?.value) {
      onChange(selected.value);
    } else {
      onChange('');
    }
    onRunQuery();
  }, [onChange, onRunQuery]);

  const handleCreateOption = React.useCallback((newValue: string) => {
    console.log("Custom value created:", newValue);
    onChange(newValue);
    onRunQuery();
  }, [onChange, onRunQuery]);

  // Debug: log when component renders
  console.log("VariableSelector render - options:", variableOptions.length, "selected:", value);

  return (
    <InlineField label={label} labelWidth={16} tooltip={tooltip}>
      <AsyncSelect
        key={variableOptions.length} // Force re-render when options change
        defaultOptions
        loadOptions={loadOptions}
        value={selectedOption}
        onChange={handleChange}
        allowCustomValue={allowCustomValue}
        placeholder={placeholder}
        width={width}
        loadingMessage="Loading variables..."
        noOptionsMessage="No variables found"
        isClearable
        onCreateOption={handleCreateOption}
      />
    </InlineField>
  );
};