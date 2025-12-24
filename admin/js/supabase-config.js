// Supabase Configuration for Craft Soft Admin
const supabaseUrl = 'https://ogkownghceldmagzjhdq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9na293bmdoY2VsZG1hZ3pqaGRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY1NTI1MzQsImV4cCI6MjA4MjEyODUzNH0.HQ64E3jcSc0eXRKTeNYplVoqagC2LqxXUeRri0PZBM4';

// Initialize Supabase Client
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// Global shortcut for ease of use (replaces the 'db' reference where possible)
window.supabase = supabase;
window.db = supabase; // Compatibility bridge for initial stages
