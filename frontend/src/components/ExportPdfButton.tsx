import React from 'react';
import { AnalysisReport } from '../types/index';
import { downloadReportPdf } from '../utils/generatePdf';

/**
 * ExportPdfButton Component
 * 
 * A reusable React button component that triggers PDF generation and download
 * of AI analysis reports. Accepts report data and title as props.
 * 
 * Features:
 * - Type-safe with TypeScript
 * - Handles loading states
 * - Accessible button with proper ARIA attributes
 * - Error boundary with user feedback
 */

interface ExportPdfButtonProps {
  /**
   * The analysis report data to export as PDF
   * Contains scores, evaluations, recommendations, etc.
   */
  reportData: AnalysisReport;

  /**
   * Title to display at the top of the PDF document
   * Also used in the generated filename
   */
  title: string;

  /**
   * Optional custom button text
   * Defaults to "Download PDF Report"
   */
  buttonText?: string;

  /**
   * Optional CSS class for custom styling
   */
  className?: string;

  /**
   * Optional callback fired when PDF generation begins
   */
  onExportStart?: () => void;

  /**
   * Optional callback fired when PDF generation completes successfully
   */
  onExportSuccess?: () => void;

  /**
   * Optional callback fired if PDF generation fails
   */
  onExportError?: (error: Error) => void;

  /**
   * Optional flag to disable the button
   */
  disabled?: boolean;
}

/**
 * ExportPdfButton - React Functional Component
 * 
 * Renders a button that generates and downloads a professional PDF report
 * from the provided AnalysisReport data.
 * 
 * Usage Example:
 * ```tsx
 * <ExportPdfButton
 *   reportData={analysisReport}
 *   title="Document Analysis Report"
 *   buttonText="Export as PDF"
 * />
 * ```
 * 
 * @param props - Component props
 * @returns React element
 */
export const ExportPdfButton: React.FC<ExportPdfButtonProps> = ({
  reportData,
  title,
  buttonText = 'Download PDF Report',
  className = '',
  onExportStart,
  onExportSuccess,
  onExportError,
  disabled = false,
}) => {
  // Loading state to prevent multiple clicks during export
  const [isLoading, setIsLoading] = React.useState(false);

  /**
   * Handle PDF export click event
   * 
   * Process:
   * 1. Set loading state to prevent duplicate requests
   * 2. Fire onExportStart callback if provided
   * 3. Call downloadReportPdf utility function
   * 4. Handle success and error states
   * 5. Clear loading state
   */
  const handleExportClick = async (): Promise<void> => {
    try {
      setIsLoading(true);

      // Fire start callback
      onExportStart?.();

      // Generate and download PDF
      // Note: downloadReportPdf is synchronous and handles file download directly
      downloadReportPdf(reportData, title);

      // Fire success callback
      onExportSuccess?.();
    } catch (error) {
      // Handle and report errors
      const errorObject = error instanceof Error 
        ? error 
        : new Error('Unknown error during PDF export');
      
      console.error('PDF Export Error:', errorObject);
      onExportError?.(errorObject);
    } finally {
      // Clear loading state
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleExportClick}
      disabled={disabled || isLoading}
      className={`export-pdf-button ${className}`}
      aria-label={`${buttonText}. Generates a PDF report for ${title}`}
      title={`Generate and download PDF: ${title}-[date].pdf`}
      type="button"
    >
      {/* Show loading indicator while exporting */}
      {isLoading ? (
        <>
          Generating PDF...
        </>
      ) : (
        <>
          {buttonText}
        </>
      )}
    </button>
  );
};

/**
 * Default export for convenience
 */
export default ExportPdfButton;
