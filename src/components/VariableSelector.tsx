import React, { useMemo, useState, useCallback } from 'react';
import { AsyncSelect, InlineField } from '@grafana/ui';
import { SelectableValue } from '@grafana/data';

export interface VariableType {
  id: number;
  variableName: string;
}

interface VariableSelectorProps {
  value?: string | null;
  onChange: (value: number | string) => void;
  onTextChange: (value: string) => void;
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
  onTextChange,
  onRunQuery = () => {},
  variables = [],
  width = 40,
  label = 'Variable',
  tooltip = 'Select a variable or enter custom value',
  allowCustomValue = true,
  placeholder = 'Select or type a value...',
}) => {
  const [inputValue, setInputValue] = useState('');

  const variableOptions = useMemo(() => {
    return variables.map((variable) => ({
      label: variable.variableName,
      value: variable.id.toString(),
      original: variable,
    }));
  }, [variables]);

  const selectedOption = useMemo(() => {
    return (
      variableOptions.find((opt) => opt.value === value?.toString()) ||
      (value && allowCustomValue
        ? { label: value.toString(), value: value.toString() }
        : null)
    );
  }, [variableOptions, value, allowCustomValue]);

  const loadOptions = useCallback(
    async (inputValue: string): Promise<Array<SelectableValue<string>>> => {
      if (!inputValue) {
        return variableOptions;
      }

      const filtered = variableOptions.filter(
        (option) =>
          option.label.toLowerCase().includes(inputValue.toLowerCase()) ||
          option.value.toLowerCase().includes(inputValue.toLowerCase())
      );

      return filtered;
    },
    [variableOptions]
  );

  const handleChange = useCallback(
    (selected: SelectableValue<string>) => {
      if (selected?.value) {
        onChange(selected.value);
      } else {
        onChange('');
      }
      setInputValue(''); // clear input only on select
      onRunQuery();
    },
    [onChange, onRunQuery]
  );

  const handleCreateOption = useCallback(
    (newValue: string) => {
      onChange(newValue);
      setInputValue(newValue);
      onRunQuery();
    },
    [onChange, onRunQuery]
  );

  const handleInputChange = useCallback(
    (newInputValue: string, { action }: { action: string }) => {
      if (action === 'input-change') {
        setInputValue(newInputValue);
        onTextChange(newInputValue);
      }
      return newInputValue;
    },
    [onTextChange]
  );

  return (
    <InlineField label={label} labelWidth={16} tooltip={tooltip}>
      <AsyncSelect
        defaultOptions
        cacheOptions
        loadOptions={loadOptions}
        value={selectedOption}
        inputValue={inputValue}
        onInputChange={handleInputChange}
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
