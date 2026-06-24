const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const url = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const key = process.env.SUPABASE_KEY || 'placeholder';

const supabase = createClient(url, key);

module.exports = supabase;
