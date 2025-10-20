import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { AsyncSelect, InlineField, MultiSelect, Badge, Stack, Button } from '@grafana/ui';
import { SelectableValue } from '@grafana/data';

export interface VariableType {
  id: number;
  variableName: string;
}

interface VariableSelectorProps {
  value?: number[] | null;
  onChange: (variables: VariableType[]) => void;
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
  value = [],
  onChange,
  onTextChange,
  onRunQuery = () => {},
  variables = [],
  width = 40,
  label = 'Variables',
  tooltip = 'Select variables or enter custom values',
  allowCustomValue = true,
  placeholder = 'Select or type values...',
  debounceMs = 1500,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [selectedVariables, setSelectedVariables] = useState<VariableType[]>([]);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (value && value.length > 0) {
      const selected = variables.filter(variable => 
        value.includes(variable.id)
      );
      setSelectedVariables(selected);
    } else {
      setSelectedVariables([]);
    }
  }, [value, variables]);

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

  const selectedOptions = useMemo(() => {
    return variableOptions.filter(opt => 
      value?.includes(Number(opt.value)) || false
    );
  }, [variableOptions, value]);

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
    (selected: Array<SelectableValue<string>>) => {
      const selectedVars: VariableType[] = selected.map(option => ({
        id: Number(option.value),
        variableName: option.label!!
      }));
      
      setSelectedVariables(selectedVars);
      onChange(selectedVars);
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
    <Stack direction="column" gap={1}>
      <InlineField label={label} labelWidth={16} tooltip={tooltip}>
        <MultiSelect
          key={selectKey}
          defaultOptions={variableOptions}
          cacheOptions={false}
          loadOptions={loadOptions}
          value={selectedOptions}
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

    </Stack>
  );
};