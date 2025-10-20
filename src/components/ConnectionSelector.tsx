import React, { useEffect, useState } from 'react';
import { AsyncSelect, InlineField } from '@grafana/ui';
import { SelectableValue } from '@grafana/data';

export interface ConnectionType {
  id: number;
  name: string;
}

interface ConnectionSelectorProps {
  value?: number | string | null; 
  onChange: (id: number | null, name?: string) => void;
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
  const [selectedOption, setSelectedOption] = useState<SelectableValue<string> | null>(null);

  const connectionOptions = connections.map((connection) => ({
    label: connection.name,
    value: connection.id.toString(),
    original: connection,
  }));

  // 🧠 Keep UI in sync with saved value from MyQuery
  useEffect(() => {
    if (!value) {
      setSelectedOption(null);
      return;
    }

    const matched = connectionOptions.find((opt) => opt.value === value.toString());
    if (matched) {
      setSelectedOption(matched);
    } else if (typeof value === 'string' && allowCustomValue) {
      setSelectedOption({ label: value, value });
    }
  }, [value, connections]);

  const loadOptions = async (inputValue: string): Promise<Array<SelectableValue<string>>> => {
    return new Promise((resolve) => {
      if (!inputValue) {
        resolve(connectionOptions);
        return;
      }

      const filtered = connectionOptions.filter(
        (option) =>
          option.label.toLowerCase().includes(inputValue.toLowerCase()) ||
          option.value.toLowerCase().includes(inputValue.toLowerCase())
      );
      resolve(filtered);
    });
  };

  const handleChange = (selected: SelectableValue<string> | null) => {
    if (selected?.value) {
      const conn = connections.find((c) => c.id.toString() === selected.value);
      setSelectedOption(selected);
      onChange(conn ? conn.id : Number(selected.value), conn?.name);
    } else {
      setSelectedOption(null);
      onChange(null);
    }
    onRunQuery();
  };

  const handleInputChange = (inputValue: string, { action }: { action: string }) => {
    if (action === 'input-change') {
      onTextChange(inputValue);
    }
    return inputValue;
  };

  const handleCreateOption = (newValue: string) => {
    const newOpt = { label: newValue, value: newValue };
    setSelectedOption(newOpt);
    onChange(null, newValue);
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
