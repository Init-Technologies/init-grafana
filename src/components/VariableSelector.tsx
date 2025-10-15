import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
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
  debounceMs?: number; 
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
  debounceMs = 1500, // default debounce delay
}) => {
  const [inputValue, setInputValue] = useState('');
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const variableOptions = useMemo(
    () =>
      variables.map((variable) => ({
        label: variable.variableName,
        value: variable.id.toString(),
        original: variable,
      })),
    [variables]
  );

  const [selectKey, setSelectKey] = useState(0);
  useEffect(() => {
    setSelectKey((prev) => prev + 1);
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
      if (!inputValue) return variableOptions;
      return variableOptions.filter(
        (option) =>
          option.label.toLowerCase().includes(inputValue.toLowerCase()) ||
          option.value.toLowerCase().includes(inputValue.toLowerCase())
      );
    },
    [variableOptions]
  );

  const handleChange = useCallback(
    (selected: SelectableValue<string>) => {
      onChange(selected?.value ?? '');
      setInputValue('');
      onRunQuery();
    },
    [onChange, onRunQuery]
  );

  
  const handleInputChange = useCallback(
    (newInputValue: string, { action }: { action: string }) => {
      if (action === 'input-change') {
        setInputValue(newInputValue);

        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
          onTextChange(newInputValue);
        }, debounceMs);
      }
      return newInputValue;
    },
    [onTextChange, debounceMs]
  );

  return (
    <InlineField label={label} labelWidth={16} tooltip={tooltip}>
      <AsyncSelect
        key={selectKey}
        defaultOptions={variableOptions}
        cacheOptions={false}
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
      />
    </InlineField>
  );
};
