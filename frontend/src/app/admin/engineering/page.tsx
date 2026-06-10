import EngineeringReportClient from '@/components/EngineeringReportClient';
import { getEngineeringReport } from '@/app/actions/getEngineeringReport';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Engineering Report | Admin CMS',
  description: 'D-VIEW Engineering Report and System Architecture',
};

export default async function EngineeringReportPage() {
  const { metadata: reportMetadata, markdownContent } = await getEngineeringReport();

  return (
    <div className="bg-surface rounded-3xl p-6 sm:p-8 border border-border shadow-sm">
      <EngineeringReportClient metadata={reportMetadata} markdownContent={markdownContent} />
    </div>
  );
}
