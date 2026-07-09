import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://hnnhlmemiicfrjhwwvni.supabase.co";
const supabaseServiceRoleKey =
	"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhubmhsbWVtaWljZnJqaHd3dm5pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODE5NDM1NiwiZXhwIjoyMDgzNzcwMzU2fQ.rqtjsMq9hwq1TcfqJcjpChNYrvmInj5tD_hF7wl-fmM";

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// Try creating the table via a raw SQL query using the REST API
// The /rest/v1/rpc/ endpoint won't work without exec_sql function.
// Instead, let's just try inserting into the table to see if it exists.

async function checkAndCreate() {
	// First, check if the table exists by describing it
	const { data, error } = await supabase
		.from("rsvp_submissions")
		.select("id")
		.limit(1);

	if (error && error.code === "42P01") {
		console.log("Table does not exist. Please run the SQL in supabase-migration.sql via the Supabase Dashboard.");
		console.log("");
		console.log("Go to: https://supabase.com/dashboard/project/hnnhlmemiicfrjhwwvni/sql/new");
		console.log("Then paste and run the contents of supabase-migration.sql");
		process.exit(1);
	} else if (error) {
		console.error("Error checking table:", error);
		process.exit(1);
	} else {
		console.log("Table rsvp_submissions already exists! Ready to go.");
		process.exit(0);
	}
}

checkAndCreate();
