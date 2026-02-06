import { Suspense } from 'react';
import TabletClient from "@/components/TabletClient";

export const dynamic = 'force-dynamic';

export default function TabletPage() {
    return (
        <main>
            <Suspense fallback={<div>Loading...</div>}>
                <TabletClient />
            </Suspense>
        </main>
    );
}
