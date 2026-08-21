-- Coaching + support staff from IU Athletics (2027 staff page).
-- Source: https://iuhoosiers.com/sports/softball/coaches (retrieved 2026-08-21)
-- Seed only table fields published there. No bios or headshots.

CREATE TABLE IF NOT EXISTS public.coaches (
  id text PRIMARY KEY,
  name text NOT NULL,
  title text NOT NULL,
  email text,
  phone text,
  group_name text NOT NULL,
  sort_order integer NOT NULL,
  source_url text NOT NULL,
  sourced_at date NOT NULL,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT coaches_group_name_check
    CHECK (group_name = ANY (ARRAY['coaching'::text, 'support'::text]))
);

ALTER TABLE public.coaches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read access" ON public.coaches;
CREATE POLICY "Public read access"
  ON public.coaches
  FOR SELECT
  USING (true);

REVOKE INSERT, UPDATE, DELETE ON TABLE public.coaches FROM anon;
GRANT SELECT ON TABLE public.coaches TO anon;
GRANT SELECT ON TABLE public.coaches TO authenticated;
GRANT ALL ON TABLE public.coaches TO service_role;

INSERT INTO public.coaches (
  id, name, title, email, phone, group_name, sort_order, source_url, sourced_at
) VALUES
  (
    'shonda-stanton',
    'Shonda Stanton',
    'Head Coach',
    'softball@iu.edu',
    '(812) 855-9518',
    'coaching',
    1,
    'https://iuhoosiers.com/sports/softball/coaches',
    '2026-08-21'
  ),
  (
    'chanda-bell',
    'Chanda Bell',
    'Associate Head Coach',
    'bell1@iu.edu',
    '(812) 855-9738',
    'coaching',
    2,
    'https://iuhoosiers.com/sports/softball/coaches',
    '2026-08-21'
  ),
  (
    'kendra-kirkhoff',
    'Kendra Kirkhoff',
    'Assistant Coach',
    'kennkirk@iu.edu',
    NULL,
    'coaching',
    3,
    'https://iuhoosiers.com/sports/softball/coaches',
    '2026-08-21'
  ),
  (
    'cassie-hendrix',
    'Cassie Hendrix',
    'Assistant Coach/Director of Operations',
    'hendrix@iu.edu',
    '(812) 855-5462',
    'coaching',
    4,
    'https://iuhoosiers.com/sports/softball/coaches',
    '2026-08-21'
  ),
  (
    'morgan-deplanty',
    'Morgan DePlanty, MS, LAT, ATC',
    'Athletic Trainer (Softball, Men''s Tennis)',
    'mdeplant@iu.edu',
    '(812) 855-1326',
    'support',
    10,
    'https://iuhoosiers.com/sports/softball/coaches',
    '2026-08-21'
  ),
  (
    'ben-smith',
    'Ben Smith',
    'Assistant Director of Academic Services and Certification',
    'bds10@iu.edu',
    '(812) 855-2861',
    'support',
    11,
    'https://iuhoosiers.com/sports/softball/coaches',
    '2026-08-21'
  ),
  (
    'jackson-yeary',
    'Jackson Yeary',
    'Assistant Director for Strategic Communications (Field Hockey, Wrestling, Softball, Men''s Tennis)',
    'jbyeary@iu.edu',
    NULL,
    'support',
    12,
    'https://iuhoosiers.com/sports/softball/coaches',
    '2026-08-21'
  ),
  (
    'aidan-mattox',
    'Aidan Mattox',
    'Student Manager',
    NULL,
    NULL,
    'support',
    13,
    'https://iuhoosiers.com/sports/softball/coaches',
    '2026-08-21'
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  title = EXCLUDED.title,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  group_name = EXCLUDED.group_name,
  sort_order = EXCLUDED.sort_order,
  source_url = EXCLUDED.source_url,
  sourced_at = EXCLUDED.sourced_at,
  updated_at = now();
