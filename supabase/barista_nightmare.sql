-- Barista's Nightmare (Multiplayer Game) Schema
-- This script creates the necessary tables for the multiplayer barista game.
-- Execute this in your Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS game_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    room_code TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'lobby' CHECK (status IN ('lobby', 'playing', 'finished')),
    created_by TEXT NOT NULL, -- customer_phone of the host
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_game_sessions_room_code ON game_sessions(room_code);

CREATE TABLE IF NOT EXISTS game_players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES game_sessions(id) ON DELETE CASCADE,
    customer_phone TEXT NOT NULL,
    customer_name TEXT,
    rounds_survived INTEGER DEFAULT 0,
    eliminated_at_round INTEGER,
    is_winner BOOLEAN DEFAULT FALSE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(session_id, customer_phone)
);

CREATE TABLE IF NOT EXISTS game_rounds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES game_sessions(id) ON DELETE CASCADE,
    round_number INTEGER NOT NULL,
    correct_attributes JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(session_id, round_number)
);

-- RLS Policies (Assuming service_role is used for all server-side API calls, we just need basic RLS)
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_rounds ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated/anon users if needed, but the API handles the logic via service_role.
-- Just creating basic policies to prevent completely open access.
CREATE POLICY "Public profiles are viewable by everyone." ON game_sessions FOR SELECT USING (true);
CREATE POLICY "Public profiles are viewable by everyone." ON game_players FOR SELECT USING (true);
-- game_rounds should not be readable directly to prevent cheating. API handles it.

-- ADD PAYLOAD FOR SPARKLE PARTY AI QUESTIONS
ALTER TABLE game_rounds ADD COLUMN payload JSONB;
