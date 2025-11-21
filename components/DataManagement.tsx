
import React, { useRef } from 'react';

interface DataManagementProps {
  onFileImport: (file: File) => void;
  onExport: () => void;
  isImporting: boolean;
}

const DataManagement: React.FC<DataManagementProps> = ({ onFileImport, onExport, isImporting }) => {
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
      "Remark",
      "Visit Won"
    ];
    const exampleInterestedRow = [
      "John Doe",
      "9876543210",
      "Interested",
      "2024-07-30 15:45",
      "",
      "Interested in 2BHK flat.",
      "TRUE"
    ];
    const exampleDetailsShareRow = [
      "Peter Jones",
      "1234567890",
      "Details Share",
      "2024-07-31 10:00",
      "",
      "Sent brochure.",
      "FALSE"
    ];
    const exampleCallbackRow = [
      "Jane Smith",
      "5551234567",
      "Call Back Later",
      "2024-07-30 16:00",
      "2024-08-01 11:00",
      "Asked to call back next week.",
      ""
    ];

    const csvContent = "data:text/csv;charset=utf-8," 
      + [
          headers.join(","), 
          exampleInterestedRow.join(","),
          exampleDetailsShareRow.join(","),
          exampleCallbackRow.join(",")
        ].join("\n");

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
      <div className="space-y-6 divide-y divide-slate-200">
        
        {/* Export Section */}
        <div className="pb-2">
            <h3 className="font-semibold text-slate-600 mb-2">Save & Export</h3>
            <p className="text-sm text-slate-500 mb-3">Save a copy of all your current call logs to an Excel file on your device.</p>
            <button
                onClick={onExport}
                className="w-full flex justify-center items-center gap-2 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                Save / Export Data
            </button>
        </div>

        {/* Import Section */}
        <div className="pt-4 space-y-3">
            <div>
                <h3 className="font-semibold text-slate-600">Import Data</h3>
                 <p className="text-sm text-slate-500 mt-1">
                    Upload an Excel or CSV file to add bulk records.
                </p>
            </div>

            <button
                onClick={handleDownloadTemplate}
                className="w-full flex justify-center items-center gap-2 py-2 px-4 border border-slate-300 rounded-md shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-colors"
            >
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd" /></svg>
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
    </div>
  );
};

export default DataManagement;
