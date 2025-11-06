import React, { useRef } from 'react';

interface DataImporterProps {
  onFileImport: (file: File) => void;
  isImporting: boolean;
}

const DataImporter: React.FC<DataImporterProps> = ({ onFileImport, isImporting }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileImport(file);
      // Reset file input to allow uploading the same file again
      event.target.value = '';
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleDownloadTemplate = () => {
    const headers = [
      "Name", 
      "Number", 
      "FEEDBACK", 
      "Date", 
      "Callback Time", 
      "Remark"
    ];
    const exampleRow = [
      "John Doe",
      "9876543210",
      "Interested",
      "2024-07-30 15:45",
      "",
      "Interested in 2BHK flat."
    ];
     const exampleCallbackRow = [
      "Jane Smith",
      "5551234567",
      "Call Back Later",
      "2024-07-30 16:00",
      "2024-08-01 11:00",
      "Asked to call back next week."
    ];

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), exampleRow.join(","), exampleCallbackRow.join(",")].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "call_log_template.csv");
    document.body.appendChild(link); 
    link.click();
    document.body.removeChild(link);
  };


  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4 text-slate-700">Data Management</h2>
      <div className="space-y-4">
        <div>
            <h3 className="font-semibold text-slate-600">Import Data</h3>
             <p className="text-sm text-slate-500 mt-1">
                Upload an Excel or CSV file. The importer will look for columns named "Name", "Date", "Number", "FEEDBACK", and "Remark".
            </p>
            <p className="text-xs text-slate-500 mt-2">
                The "FEEDBACK" column maps to the FEEDBACK field, and "Remark" maps to Notes. If required info is missing, you'll be prompted to fix it.
            </p>
        </div>

        <button
            onClick={handleDownloadTemplate}
            className="w-full flex justify-center items-center gap-2 py-2 px-4 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-colors"
        >
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
            Download Template
        </button>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept=".xlsx, .xls, .csv"
          disabled={isImporting}
        />
        <button
          onClick={handleButtonClick}
          className="w-full flex justify-center items-center gap-2 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-colors disabled:bg-sky-300 disabled:cursor-not-allowed"
          disabled={isImporting}
        >
            {isImporting ? (
                <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Importing...
                </>
            ) : (
                <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M5.5 13a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.977A4.5 4.5 0 1113.5 13H5.5z" /><path d="M9 13.5a1 1 0 011 1v1.5a.5.5 0 01-1 0V15a1 1 0 01-1-1zm-3.5-1.5a1 1 0 000-2H9a1 1 0 100 2H5.5z" /></svg>
                    Import from Excel/CSV
                </>
            )}
        </button>
      </div>
    </div>
  );
};

export default DataImporter;