'use client';

import { useEffect, useRef, useState } from 'react';
import { Printer, Plus, Minus, AlertCircle, Loader, Eye, EyeOff } from 'lucide-react';
import JsBarcode from 'jsbarcode';
import { convertToIndianFY } from '@/lib/utils/fy';

interface File {
  id: string;
  fileNumber: string;
  fileName: string;
  financialYear: number;
  department: { id: string; name: string };
  rack: { id: string; rackNumber: string; rackName: string };
  shelf?: { id: string; name: string };
}

function getGridDimensions(count: number) {
  if (count <= 1) return { cols: 1, rows: 1 };
  if (count === 2) return { cols: 2, rows: 1 };
  if (count === 3) return { cols: 3, rows: 1 };
  if (count === 4) return { cols: 2, rows: 2 };
  if (count <= 6) return { cols: 2, rows: 3 };
  if (count <= 8) return { cols: 2, rows: 4 };
  if (count === 9) return { cols: 3, rows: 3 };
  if (count <= 12) return { cols: 3, rows: 4 };
  return { cols: 3, rows: 4 };
}

export default function LabelsPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [labelsPerPage, setLabelsPerPage] = useState(4);
  const [isGeneratingBarcodes, setIsGeneratingBarcodes] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [failedBarcodes, setFailedBarcodes] = useState<Set<string>>(new Set());
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/files');
      const data = await response.json();
      setFiles(data.files || []);
    } catch (error) {
      console.error('Failed to fetch files:', error);
      setError('Failed to load files');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFile = (fileId: string) => {
    const newSelection = new Set(selectedFiles);
    if (newSelection.has(fileId)) {
      newSelection.delete(fileId);
    } else {
      newSelection.add(fileId);
    }
    setSelectedFiles(newSelection);
  };

  const selectAll = () => {
    setSelectedFiles(new Set(files.map((f) => f.id)));
  };

  const clearAll = () => {
    setSelectedFiles(new Set());
  };

  const handlePrint = async () => {
    if (selectedFiles.size === 0) {
      setError('Please select at least one file');
      return;
    }

    setIsGeneratingBarcodes(true);
    setFailedBarcodes(new Set());
    setError('');

    try {
      // Generate all barcodes with promise-based approach
      const barcodePromises = Array.from(selectedFiles).map((fileId) => {
        return new Promise<{ fileId: string; success: boolean }>((resolve) => {
          // Use requestAnimationFrame for better timing
          requestAnimationFrame(() => {
            try {
              const element = document.getElementById(`barcode-${fileId}`);
              if (element) {
                const fileObj = files.find((f) => f.id === fileId);
                const barcodeValue = fileObj ? fileObj.fileNumber : fileId;
                
                JsBarcode(`#barcode-${fileId}`, barcodeValue, {
                  format: 'CODE128',
                  width: 1.5,
                  height: 40,
                  displayValue: true,
                  fontSize: 10,
                  font: 'monospace',
                  textMargin: 2,
                  margin: 0,
                });
                resolve({ fileId, success: true });
              } else {
                resolve({ fileId, success: false });
              }
            } catch (err) {
              console.error(`Failed to generate barcode for ${fileId}:`, err);
              resolve({ fileId, success: false });
            }
          });
        });
      });

      // Wait for all barcodes to generate
      const results = await Promise.all(barcodePromises);
      const failed = results.filter((r) => !r.success).map((r) => r.fileId);
      
      if (failed.length > 0) {
        setFailedBarcodes(new Set(failed));
        if (failed.length === selectedFiles.size) {
          setError('Failed to generate barcodes. Please try again.');
          setIsGeneratingBarcodes(false);
          return;
        }
      }

      // Show preview or print
      if (showPreview) {
        setShowPreview(true);
      } else {
        // Use setTimeout to ensure DOM is ready
        setTimeout(() => {
          window.print();
        }, 100);
      }
    } catch (err) {
      console.error('Print error:', err);
      setError('An error occurred while preparing labels');
    } finally {
      setIsGeneratingBarcodes(false);
    }
  };

  const selectedFileObjects = files.filter((f) => selectedFiles.has(f.id));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <Printer className="w-8 h-8" />
          Label Printing
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPreview(!showPreview)}
            disabled={selectedFiles.size === 0}
            className="flex items-center gap-2 px-4 py-2 bg-neutral-600 text-white rounded-lg hover:bg-neutral-700 transition-colors disabled:opacity-50"
          >
            {showPreview ? (
              <>
                <EyeOff className="w-5 h-5" />
                Hide Preview
              </>
            ) : (
              <>
                <Eye className="w-5 h-5" />
                Show Preview
              </>
            )}
          </button>
          <button
            onClick={handlePrint}
            disabled={selectedFiles.size === 0 || isGeneratingBarcodes}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isGeneratingBarcodes ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Printer className="w-5 h-5" />
                Print Labels
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
      )}

      {/* Failed Barcodes Warning */}
      {failedBarcodes.size > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-medium">Failed to generate barcodes for {failedBarcodes.size} file(s)</p>
            <p className="text-xs opacity-75 mt-1">These files may print with text-only labels instead</p>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="bg-white border border-neutral-200 rounded-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-foreground mb-2">Select Files</h2>
            <p className="text-sm text-neutral-600">
              {selectedFiles.size} of {files.length} files selected
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={selectAll}
              disabled={files.length === 0}
              className="px-4 py-2 border border-neutral-300 text-foreground rounded-lg hover:bg-neutral-50 transition-colors disabled:opacity-50"
            >
              Select All
            </button>
            <button
              onClick={clearAll}
              disabled={selectedFiles.size === 0}
              className="px-4 py-2 border border-neutral-300 text-foreground rounded-lg hover:bg-neutral-50 transition-colors disabled:opacity-50"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4 pt-4 border-t border-neutral-200">
          <label className="text-sm font-medium text-foreground">Labels per page:</label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLabelsPerPage(Math.max(1, labelsPerPage - 1))}
              className="p-1 border border-neutral-300 rounded hover:bg-neutral-50"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold w-8 text-center">{labelsPerPage}</span>
            <button
              onClick={() => setLabelsPerPage(Math.min(12, labelsPerPage + 1))}
              className="p-1 border border-neutral-300 rounded hover:bg-neutral-50"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* File Selection List */}
      {isLoading ? (
        <div className="bg-white border border-neutral-200 rounded-lg p-12 text-center">
          <Loader className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
          <p className="text-neutral-600">Loading files...</p>
        </div>
      ) : files.length === 0 ? (
        <div className="bg-white border border-neutral-200 rounded-lg p-12 text-center">
          <Printer className="w-12 h-12 text-neutral-400 mx-auto mb-3 opacity-50" />
          <p className="text-neutral-600">No files available for printing</p>
        </div>
      ) : (
        <div className="bg-white border border-neutral-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-50">
                <tr className="border-b border-neutral-200">
                  <th className="px-6 py-3 text-left w-12">
                    <input
                      type="checkbox"
                      checked={selectedFiles.size === files.length && files.length > 0}
                      onChange={() => {
                        if (selectedFiles.size === files.length) {
                          clearAll();
                        } else {
                          selectAll();
                        }
                      }}
                      className="rounded"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-600">
                    File Number
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-600">
                    File Name
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-600">
                    Department
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-neutral-600">
                    Rack
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {files.map((file) => (
                  <tr
                    key={file.id}
                    className={`transition-colors ${
                      selectedFiles.has(file.id) ? 'bg-blue-50' : 'hover:bg-neutral-50'
                    }`}
                  >
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedFiles.has(file.id)}
                        onChange={() => toggleFile(file.id)}
                        className="rounded"
                      />
                    </td>
                    <td className="px-6 py-4 text-sm font-mono text-neutral-900">
                      {file.fileNumber}
                    </td>
                    <td className="px-6 py-4 text-sm text-neutral-900">{file.fileName}</td>
                    <td className="px-6 py-4 text-sm text-neutral-600">
                      {file.department.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-neutral-600">
                      {file.rack.rackNumber} - {file.rack.rackName}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Print Preview */}
      <div id="print-container-root" ref={printRef} style={{ display: showPreview ? 'block' : 'none' }} className="print:block border border-neutral-200 rounded-lg bg-white p-4 print:border-0 print:p-0">
        <style>{`
          @page {
            size: A4 portrait;
            margin: 10mm 15mm;
          }

          @media screen {
            #print-container-root {
              background-color: #f8fafc !important;
              padding: 2.5rem !important;
              border: 1px solid #e2e8f0 !important;
              border-radius: 0.75rem !important;
              box-shadow: inset 0 2px 4px 0 rgba(0, 0, 0, 0.05) !important;
              margin-top: 2rem !important;
            }

            .label-page {
              width: 210mm;
              height: 297mm;
              background: white;
              padding: 10mm 15mm;
              box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
              border-radius: 0.5rem;
              margin: 0 auto 2.5rem auto;
              box-sizing: border-box;
              gap: 6mm;
            }

            .label-page:last-child {
              margin-bottom: 0;
            }
          }

          @media print {
            aside, header, main > div > *:not(#print-container-root) {
              display: none !important;
            }
            
            body, html {
              margin: 0 !important;
              padding: 0 !important;
              background: #fff !important;
              width: 100% !important;
              height: auto !important;
            }
            
            .min-h-screen {
              min-height: auto !important;
              background: none !important;
            }
            
            .flex-1 {
              margin-left: 0 !important;
              padding: 0 !important;
            }
            
            main {
              padding: 0 !important;
              margin: 0 !important;
            }

            #print-container-root {
              display: block !important;
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              border: none !important;
              padding: 0 !important;
              margin: 0 !important;
              background: white !important;
              box-shadow: none !important;
            }

            .label-page {
              page-break-after: always;
              page-break-inside: avoid;
              break-after: page;
              width: 100%;
              height: 277mm; 
              box-sizing: border-box;
              margin: 0;
              padding: 0;
              gap: 6mm;
            }
          }
          
          .label-item {
            box-sizing: border-box;
            width: 100%;
            height: 100%;
            page-break-inside: avoid;
            break-inside: avoid;
            display: flex;
          }
          
          .label-content {
            border: 1px dashed #cbd5e1;
            padding: 5mm;
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            gap: 2mm;
            background: white;
            border-radius: 6px;
            box-sizing: border-box;
          }

          @media print {
            .label-content {
              border: 1px dashed #000 !important;
              border-radius: 0 !important;
            }
          }
          
          .label-barcode {
            margin: 2mm 0;
            max-width: 100%;
          }

          svg[id^="barcode-"] {
            max-width: 100%;
            height: auto !important;
          }
          
          .label-text {
            font-size: 11pt;
            font-family: monospace;
            word-break: break-all;
            text-align: center;
          }
          
          .label-dept {
            font-size: 8.5pt;
            color: #475569;
            text-align: center;
            font-family: inherit;
          }

          @media print {
            .label-dept {
              color: #000 !important;
            }
          }
        `}</style>
        {Array.from({ length: Math.ceil(selectedFileObjects.length / labelsPerPage) }).map(
          (_, pageIdx) => {
            const { cols, rows } = getGridDimensions(labelsPerPage);
            return (
              <div
                key={pageIdx}
                className="label-page"
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${cols}, 1fr)`,
                  gridTemplateRows: `repeat(${rows}, 1fr)`,
                }}
              >
                {selectedFileObjects.slice(pageIdx * labelsPerPage, (pageIdx + 1) * labelsPerPage).map((file) => (
                  <div key={file.id} className="label-item">
                    <div className="label-content">
                      <div className="label-text" style={{ fontWeight: 'bold', fontSize: '11pt' }}>
                        {file.fileNumber}
                      </div>
                      <svg id={`barcode-${file.id}`}></svg>
                      <div className="label-text" style={{ maxWidth: '80mm', fontSize: '9pt' }}>
                        {file.fileName.substring(0, 30)}
                      </div>
                      <div className="label-dept">
                        {convertToIndianFY(file.financialYear)}
                      </div>
                      <div className="label-dept">
                        {file.department.name} - {file.rack.rackNumber}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            );
          }
        )}
      </div>
    </div>
  );
}
