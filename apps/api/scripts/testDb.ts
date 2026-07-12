import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function test() {
  const { data: students, error } = await supabase.from('Student').select('*, mealStatus:MealStatus(*), cards:Card(*)');
  console.log('Students:', JSON.stringify(students, null, 2));
  console.log('Error:', error);

  const { data: session } = await supabase.from('MealSession').select('*');
  console.log('MealSession:', session);
}

test();
