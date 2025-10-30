import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { InlineField, MultiSelect } from '@grafana/ui';
import { SelectableValue } from '@grafana/data';

export interface VariableType {
  id: number;
  variableName: string;
}

interface VariableSelectorProps {
  value?: number[];
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
  debounceMs = 2500,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [allVariables, setAllVariables] = useState<VariableType[]>(variables);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setAllVariables((prev) => {
      const merged = [...prev];
      for (const v of variables) {
        if (!merged.some(m => m.id === v.id)) merged.push(v);
      }
      return merged;
    });
  }, [variables]);

  const variableOptions = useMemo(
    () =>
      allVariables.map((variable) => ({
        label: variable.variableName,
        value: variable.id.toString(),
        original: variable,
      })),
    [allVariables]
  );

  const [selectKey, setSelectKey] = useState(0);
  useEffect(() => setSelectKey(prev => prev + 1), [variables]);

  const selectedOptions = useMemo(
    () => variableOptions.filter(opt => value.includes(Number(opt.value))),
    [variableOptions, value]
  );

  const loadOptions = useCallback(
    async (inputValue: string): Promise<Array<SelectableValue<string>>> => {
      if (!inputValue) return variableOptions;
      const lower = inputValue.toLowerCase();
      return variableOptions.filter(
        (option) =>
          option.label.toLowerCase().includes(lower) ||
          option.value.toLowerCase().includes(lower)
      );
    },
    [variableOptions]
  );

  const handleChange = useCallback(
    (selected: Array<SelectableValue<string>>) => {
      const selectedVars: VariableType[] = selected.map(opt => ({
        id: Number(opt.value),
        variableName: opt.label!,
      }));
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
        // if (debounceRef.current) clearTimeout(debounceRef.current);
        // debounceRef.current = setTimeout(() => onTextChange(newInputValue), debounceMs);
      }
      return newInputValue;
    },
    [onTextChange, debounceMs]
  );

  return (
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
        getOptionLabel={(opt) => opt.label}
        getOptionValue={(opt) => opt.value}
      />
    </InlineField>
  );
};
