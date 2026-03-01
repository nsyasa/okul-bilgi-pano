import { performance } from "perf_hooks";

// Mock Supabase client
const mockSb = {
  from: (table: string) => ({
    update: (data: any) => ({
      eq: async (field: string, value: any) => {
        // Simulate network latency of 10ms per query
        await new Promise(resolve => setTimeout(resolve, 10));
        return { error: null };
      }
    }),
    upsert: async (data: any[]) => {
      // Simulate slightly higher network latency for a bulk request, e.g., 20ms
      await new Promise(resolve => setTimeout(resolve, 20));
      return { error: null };
    }
  })
};

async function runBenchmark() {
  console.log("Setting up 100 updates...");

  // Create 100 fake entries
  const editedEntries = new Map<string, string | null>();
  for (let i = 0; i < 100; i++) {
    editedEntries.set(`id-${i}`, `Class ${i}`);
  }

  const updates = Array.from(editedEntries.entries());

  console.log("--- BASELINE (Sequential Updates) ---");
  const startSequential = performance.now();
  for (const [id, class_name] of updates) {
    const { error } = await mockSb
        .from("lesson_schedule")
        .update({ class_name })
        .eq("id", id);
    if (error) throw error;
  }
  const endSequential = performance.now();
  const sequentialTime = endSequential - startSequential;
  console.log(`Sequential Updates took: ${sequentialTime.toFixed(2)} ms`);

  console.log("--- OPTIMIZED (Batch Upsert) ---");
  const startBatch = performance.now();

  // To avoid overriding required columns during upsert, we need to consider if `class_name` is the only column.
  // Wait, if we use `upsert`, it might require all non-nullable columns unless we just update existing rows.
  // Since we only want to update `class_name`, Supabase `upsert` can do partial updates IF we provide the primary key.
  const batchUpdates = updates.map(([id, class_name]) => ({ id, class_name }));
  const { error } = await mockSb.from("lesson_schedule").upsert(batchUpdates);
  if (error) throw error;

  const endBatch = performance.now();
  const batchTime = endBatch - startBatch;
  console.log(`Batch Upsert took: ${batchTime.toFixed(2)} ms`);

  console.log("--- RESULT ---");
  console.log(`Improvement: ${(sequentialTime / batchTime).toFixed(2)}x faster`);
}

runBenchmark().catch(console.error);
