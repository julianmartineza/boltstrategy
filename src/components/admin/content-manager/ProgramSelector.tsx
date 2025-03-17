import React from 'react';
import { Program } from './types';

interface ProgramSelectorProps {
  programs: Program[];
  selectedProgram: string | null;
  onSelectProgram: (programId: string) => void;
  loading: boolean;
}

const ProgramSelector: React.FC<ProgramSelectorProps> = ({
  programs,
  selectedProgram,
  onSelectProgram,
  loading
}) => {
  return (
    <div className="mb-6">
      <label htmlFor="program-select" className="block text-sm font-medium text-gray-700 mb-2">
        Seleccionar Programa
      </label>
      <select
        id="program-select"
        value={selectedProgram || ''}
        onChange={(e) => onSelectProgram(e.target.value)}
        className="block w-full p-2 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        disabled={loading}
      >
        <option value="">Selecciona un programa</option>
        {programs.map((program) => (
          <option key={program.id} value={program.id}>
            {program.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default ProgramSelector;
