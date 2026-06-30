import React, { useRef, useState } from 'react';
import * as XLSX from 'xlsx';

const normalizeKey = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

const parseBoolean = (value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;

  const normalized = String(value || '').trim().toLowerCase();
  if (['true', 'yes', 'y', '1', 'active'].includes(normalized)) return true;
  if (['false', 'no', 'n', '0', 'inactive'].includes(normalized)) return false;
  return null;
};

const toDateInputValue = (value) => {
  if (value === null || value === undefined || value === '') return '';

  if (typeof value === 'number') {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const date = new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000);
    return date.toISOString().slice(0, 10);
  }

  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) return String(value);
  return parsed.toISOString().slice(0, 10);
};

const coerceValue = (field, value) => {
  if (value === null || value === undefined) return '';

  if (field === 'is_active') {
    const parsedBoolean = parseBoolean(value);
    return parsedBoolean === null ? true : parsedBoolean;
  }

  if (field.includes('date')) {
    return toDateInputValue(value);
  }

  return String(value);
};

const ExcelPrefillUpload = ({ formKeys, aliases = {}, onImport, disabled = false }) => {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setMessage('');
    setError('');

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
      const firstSheetName = workbook.SheetNames?.[0];

      if (!firstSheetName) {
        setError('No worksheet found in file.');
        return;
      }

      const rows = XLSX.utils.sheet_to_json(workbook.Sheets[firstSheetName], {
        defval: ''
      });

      if (!rows.length) {
        setError('The worksheet is empty. Add headers and at least one row.');
        return;
      }

      const firstRow = rows[0];
      const normalizedColumns = Object.entries(firstRow).reduce((acc, [key, value]) => {
        acc[normalizeKey(key)] = value;
        return acc;
      }, {});

      const importedValues = formKeys.reduce((acc, formKey) => {
        const candidates = [formKey, ...(aliases[formKey] || [])];

        const matchedValue = candidates
          .map((candidate) => normalizedColumns[normalizeKey(candidate)])
          .find((candidateValue) => candidateValue !== undefined && String(candidateValue).trim() !== '');

        if (matchedValue !== undefined) {
          acc[formKey] = coerceValue(formKey, matchedValue);
        }

        return acc;
      }, {});

      if (!Object.keys(importedValues).length) {
        setError('No matching columns found. Use headers that match form field names.');
        return;
      }

      onImport(importedValues);
      setMessage(`Prefilled ${Object.keys(importedValues).length} fields from row 1.`);
    } catch (importError) {
      console.error(importError);
      setError('Could not read Excel file. Please use .xlsx, .xls, or .csv.');
    } finally {
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  return (
    <div
      style={{
        marginBottom: '16px',
        padding: '12px',
        border: '1px dashed #cbd5e1',
        borderRadius: '8px',
        background: '#f8fafc'
      }}
    >
      <label className="form-label" style={{ marginBottom: '8px' }}>
        Upload Excel File (optional)
      </label>
      <input
        ref={inputRef}
        type="file"
        className="form-control"
        accept=".xlsx,.xls,.csv"
        onChange={handleFileChange}
        disabled={disabled}
      />
      <small style={{ color: '#64748b', display: 'block', marginTop: '8px' }}>
        The first row of data will be used to pre-fill matching form fields.
      </small>
      {message ? (
        <small style={{ color: '#059669', display: 'block', marginTop: '6px' }}>{message}</small>
      ) : null}
      {error ? <small style={{ color: '#dc2626', display: 'block', marginTop: '6px' }}>{error}</small> : null}
    </div>
  );
};

export default ExcelPrefillUpload;