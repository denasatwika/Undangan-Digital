const supabaseUrl = 'https://xiddeqoqyapihlejuvbo.supabase.co'; 
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhpZGRlcW9xeWFwaWhsZWp1dmJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI5NDAwODgsImV4cCI6MjA2ODUxNjA4OH0.88Qi6VW00CXJg910JVK51jAsODntz-3sBiaKN8CjMIQ'; 

export const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);