import EngineeringReportClient from '@/components/EngineeringReportClient';
import { getEngineeringReport } from '@/app/actions/getEngineeringReport';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Engineering Report | D-VIEW',
  description: 'D-VIEW Engineering Report and System Architecture',
};

export default async function EngineeringReportPage() {
  const { metadata, markdownContent } = await getEngineeringReport();

  return (
    <div className="min-h-screen bg-body">
      <EngineeringReportClient metadata={metadata} markdownContent={markdownContent} />
    </div>
  );
}
