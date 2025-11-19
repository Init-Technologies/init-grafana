// ---------------- VARIABLE SELECTOR UPDATED -------------------
import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { InlineField, MultiSelect } from '@grafana/ui';
import { SelectableValue } from '@grafana/data';

export interface VariableType {
  id: number;
  variableName: string;
}

interface VariableSelectorProps {
  value: VariableType[];              
  onChange: (variables: VariableType[]) => void;
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
  value = [],
  onChange,
  onTextChange,
  onRunQuery = () => {},
  variables = [],
  width = 40,
  label = 'Variables',
  tooltip = 'Select variables',
  allowCustomValue = true,
  placeholder = 'Select variables...',
}) => {
  const [inputValue, setInputValue] = useState('');
  const [options, setOptions] = useState<VariableType[]>(variables);

  useEffect(() => {
    setOptions(variables);
  }, [variables]);

  const variableOptions = useMemo(
    () =>
      options.map((v) => ({
        label: v.variableName,
        value: v.id.toString(),
        original: v,
      })),
    [options]
  );

  const selectedOptions = variableOptions.filter((o) =>
    value.some((v) => v.id === Number(o.value))
  );

  const handleChange = useCallback(
    (selected: Array<SelectableValue<string>>) => {
      const selectedVars = selected.map((opt) => ({
        id: Number(opt.value),
        variableName: opt.label!,
      }));
      onChange(selectedVars);
      onRunQuery();
    },
    [onChange, onRunQuery]
  );

  return (
    <InlineField label={label} labelWidth={16} tooltip={tooltip}>
      <MultiSelect
        options={variableOptions}
        value={selectedOptions}
        inputValue={inputValue}
        onInputChange={(v) => {
          setInputValue(v);
          onTextChange(v);
        }}
        onChange={handleChange}
        allowCustomValue={allowCustomValue}
        placeholder={placeholder}
        width={width}
        isClearable
      />
    </InlineField>
  );
};
