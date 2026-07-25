import { listLeave, createLeave } from './src/api/leave';
import { getMyTherapistId } from './src/api/therapistMe';
import { apiFetch } from './src/api/client';

async function test() {
  try {
    const id = await getMyTherapistId();
    console.log("Therapist ID:", id);
    const leaves = await listLeave(id, '2026-07-13', '2026-07-19');
    console.log("Leaves:", leaves);
  } catch (e) {
    console.error("Error:", e);
  }
}
test();
