
import { ClipboardCheck } from 'lucide-react';
import TaskBoard from './_components/task-board';
import { getTaskBoardData } from './_actions/task-actions';

export const dynamic = 'force-dynamic';

export default async function TasksPage() {
  const boardData = await getTaskBoardData();

  return (
    <main className="flex-1 flex flex-col p-4 md:p-6 lg:p-8 gap-6 md:gap-8 bg-background text-foreground">
        <div className="flex items-center gap-4">
            <div>
            <h1 className="font-headline text-3xl font-bold flex items-center gap-2">
                <ClipboardCheck className="h-8 w-8 text-primary" /> Custom Kanban
            </h1>
            <p className="text-muted-foreground">
                Organize and track your work with a drag-and-drop board.
            </p>
            </div>
        </div>

        <div className="flex-1 overflow-x-auto">
            <TaskBoard initialBoardData={boardData} />
        </div>
    </main>
  );
}
