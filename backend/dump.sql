--
-- PostgreSQL database dump
--

\restrict PodaXmsUw4p5jWtx9HY6kmWGCxb2BCup3ymtGU3l699cZYVZEaMwHo9rs5gO2ee

-- Dumped from database version 18.3 (Homebrew)
-- Dumped by pg_dump version 18.3 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: MatchStatus; Type: TYPE; Schema: public; Owner: willianlima
--

CREATE TYPE public."MatchStatus" AS ENUM (
    'SCHEDULED',
    'LIVE',
    'FINISHED',
    'CANCELLED'
);


ALTER TYPE public."MatchStatus" OWNER TO willianlima;

--
-- Name: NotificationType; Type: TYPE; Schema: public; Owner: willianlima
--

CREATE TYPE public."NotificationType" AS ENUM (
    'NEXT_MATCH_REMINDER',
    'BONUS_ROUND_ACTIVE',
    'ROUND_STARTED',
    'ROUND_RESULT'
);


ALTER TYPE public."NotificationType" OWNER TO willianlima;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: willianlima
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO willianlima;

--
-- Name: championships; Type: TABLE; Schema: public; Owner: willianlima
--

CREATE TABLE public.championships (
    id text NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    season text NOT NULL,
    country text,
    logo_url text,
    is_active boolean DEFAULT true NOT NULL,
    start_date timestamp(3) without time zone NOT NULL,
    end_date timestamp(3) without time zone NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.championships OWNER TO willianlima;

--
-- Name: match_result_history; Type: TABLE; Schema: public; Owner: willianlima
--

CREATE TABLE public.match_result_history (
    id text NOT NULL,
    match_id text NOT NULL,
    admin_user_id text NOT NULL,
    "prevHome" integer,
    "prevAway" integer,
    "newHome" integer NOT NULL,
    "newAway" integer NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.match_result_history OWNER TO willianlima;

--
-- Name: matches; Type: TABLE; Schema: public; Owner: willianlima
--

CREATE TABLE public.matches (
    id text NOT NULL,
    round_id text NOT NULL,
    home_team text NOT NULL,
    away_team text NOT NULL,
    home_score integer,
    away_score integer,
    status public."MatchStatus" DEFAULT 'SCHEDULED'::public."MatchStatus" NOT NULL,
    match_date timestamp(3) without time zone NOT NULL,
    venue text,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    is_joker boolean DEFAULT false NOT NULL,
    external_match_id integer,
    is_manual_override boolean DEFAULT false NOT NULL
);


ALTER TABLE public.matches OWNER TO willianlima;

--
-- Name: notifications; Type: TABLE; Schema: public; Owner: willianlima
--

CREATE TABLE public.notifications (
    id text NOT NULL,
    user_id text NOT NULL,
    pool_id text,
    type public."NotificationType" NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    read_at timestamp(3) without time zone
);


ALTER TABLE public.notifications OWNER TO willianlima;

--
-- Name: pool_members; Type: TABLE; Schema: public; Owner: willianlima
--

CREATE TABLE public.pool_members (
    id text NOT NULL,
    user_id text NOT NULL,
    pool_id text NOT NULL,
    joined_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    score integer DEFAULT 0 NOT NULL,
    favorite_team text,
    heart_team_score integer DEFAULT 0 NOT NULL
);


ALTER TABLE public.pool_members OWNER TO willianlima;

--
-- Name: pools; Type: TABLE; Schema: public; Owner: willianlima
--

CREATE TABLE public.pools (
    id text NOT NULL,
    name text NOT NULL,
    code text NOT NULL,
    description text,
    is_public boolean DEFAULT false NOT NULL,
    max_members integer,
    owner_id text NOT NULL,
    championship_id text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    bonus_round_id text,
    starting_round_id text
);


ALTER TABLE public.pools OWNER TO willianlima;

--
-- Name: predictions; Type: TABLE; Schema: public; Owner: willianlima
--

CREATE TABLE public.predictions (
    id text NOT NULL,
    user_id text NOT NULL,
    match_id text NOT NULL,
    home_score_tip integer NOT NULL,
    away_score_tip integer NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    pool_id text NOT NULL,
    points integer DEFAULT 0 NOT NULL,
    scored_at timestamp(3) without time zone,
    is_joker boolean DEFAULT false NOT NULL
);


ALTER TABLE public.predictions OWNER TO willianlima;

--
-- Name: round_winners; Type: TABLE; Schema: public; Owner: willianlima
--

CREATE TABLE public.round_winners (
    id text NOT NULL,
    pool_id text NOT NULL,
    round_id text NOT NULL,
    user_id text NOT NULL,
    favorite_team text,
    round_points integer NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.round_winners OWNER TO willianlima;

--
-- Name: rounds; Type: TABLE; Schema: public; Owner: willianlima
--

CREATE TABLE public.rounds (
    id text NOT NULL,
    championship_id text NOT NULL,
    number integer NOT NULL,
    name text NOT NULL,
    start_date timestamp(3) without time zone NOT NULL,
    end_date timestamp(3) without time zone NOT NULL,
    is_open boolean DEFAULT false NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.rounds OWNER TO willianlima;

--
-- Name: score_rules; Type: TABLE; Schema: public; Owner: willianlima
--

CREATE TABLE public.score_rules (
    id text NOT NULL,
    bonus_round_multiplier double precision DEFAULT 2 NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    exact_score_bonus integer DEFAULT 0 NOT NULL,
    joker_multiplier double precision DEFAULT 2 NOT NULL,
    points_for_away_goals integer DEFAULT 5 NOT NULL,
    points_for_home_goals integer DEFAULT 5 NOT NULL,
    points_for_outcome integer DEFAULT 10 NOT NULL,
    pool_id text NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL
);


ALTER TABLE public.score_rules OWNER TO willianlima;

--
-- Name: users; Type: TABLE; Schema: public; Owner: willianlima
--

CREATE TABLE public.users (
    id text NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    password_hash text NOT NULL,
    avatar_url text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone NOT NULL,
    favorite_team text,
    role text DEFAULT 'USER'::text NOT NULL
);


ALTER TABLE public.users OWNER TO willianlima;

--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: willianlima
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
8e1ce5e4-115f-4464-8190-5cd2c5bba702	46470010c105dba38e4074e5122200ef88e67015ba69a4d9011d617fb9dcecf8	2026-04-06 17:25:00.687084-04	20260406200819_init	\N	\N	2026-04-06 17:25:00.665664-04	1
a9675c40-5a20-4708-ba67-6873d49bd246	f2112a27c0b04ec155cf35251430868ba332d09b4d8cc0284e858ecd498d17ca	2026-04-06 17:25:00.69069-04	20260406203405_add_pool_id_to_prediction	\N	\N	2026-04-06 17:25:00.687546-04	1
8916d724-a75a-4009-bf9a-ce501aa22bdf	30ffbbf4600ad3fc0d93c4bd17763dd2bdbe470584af995e056c7067bea1bdec	2026-04-06 17:25:41.103633-04	20260406212541_scoring_engine_v1	\N	\N	2026-04-06 17:25:41.094133-04	1
3ab1ab7c-1343-4913-b5c5-c81b9e36efad	d176f8f4d05df4d1dbd0401474c4b972b186d50782228762a98664e5e0811e31	2026-04-06 17:59:02.250652-04	20260406215902_add_pool_is_active	\N	\N	2026-04-06 17:59:02.248749-04	1
33a1a6ac-b04f-4b37-a468-ace89716ba11	ab86f6107cf9fc39104ac556063c0e5ac19d82e590591fa43fc94555d3984df7	2026-04-07 13:50:35.002562-04	20260407175034_add_favorite_team_and_round_winners	\N	\N	2026-04-07 13:50:34.980672-04	1
f7295ff5-98c3-4080-9389-6b52898dea2a	4d661f743989ca95d708261b31b92f92257ee33f14b5fd28fae56d392f3230ba	2026-04-10 07:57:03.093079-04	20260410115703_add_joker_to_prediction	\N	\N	2026-04-10 07:57:03.089323-04	1
bb625ec2-a87f-4f73-ad6b-9a1f82a48b64	4a7cbcee9950efe7acf29eabd03e4c21c2bc043490cbf2cad39dbe168147122c	2026-04-13 12:09:17.344901-04	20260413160917_bonus_round_per_pool	\N	\N	2026-04-13 12:09:17.331324-04	1
292d93ef-48f6-4ddf-ba5b-a26491d066ac	04b8a49a9972ae0f62ea36009a18d63a538d4922ef4ceaab0a66094e889143b8	2026-04-27 21:14:56.173044-04	20260428011456_add_match_result_history	\N	\N	2026-04-27 21:14:56.163291-04	1
a165e764-0379-4611-b6a1-2a4485fb4f2d	130848fd7ca2eab589ceca9c38fc8f664106148cb4e1d85ffe87168e679ddd3e	2026-04-13 18:15:03.01119-04	20260413221502_add_notifications	\N	\N	2026-04-13 18:15:03.002218-04	1
f47121fd-05a9-4ff2-977c-ffc25ef7fecb	8d6d08761a8c86630ad38f0e7380fcc7a970396176e8699c39bef247971a2b4f	2026-04-20 16:28:14.221542-04	20260420202814_add_user_role	\N	\N	2026-04-20 16:28:14.216759-04	1
de2ba0f1-0d81-4ef8-a943-c10f056681ab	eaac6e861c8ffaf8522f6cbe707afce5dcfdb88dc8e74858ff6c1c841831f37c	2026-04-21 16:37:18.615861-04	20260421203718_add_external_match_id	\N	\N	2026-04-21 16:37:18.611549-04	1
2ae0f8d6-7598-4f81-ab5a-48528e40c71f	00f25c1c6be724143787236d1068d8769f0908bd66e1fd1b6d6ef46a711c33d3	2026-04-24 14:47:19.047558-04	20260424184719_add_pool_member_heart_team	\N	\N	2026-04-24 14:47:19.041417-04	1
a2d5e709-02a5-404e-918a-46cb8dac9c54	a5873c700bf63b8be4979583b10f164d546a3401ed7ae1e60b93abb27d699f64	2026-04-24 15:16:47.951359-04	20260424191647_add_pool_starting_round	\N	\N	2026-04-24 15:16:47.947016-04	1
34aefb7d-bb9b-4b51-89f4-6869d1a609a2	14963674ac238d5a6e65b3efb0b21808a0747466b890066ef4c2f7fd8899f49c	2026-04-27 16:30:19.08894-04	20260427203019_add_manual_match_override	\N	\N	2026-04-27 16:30:19.085337-04	1
\.


--
-- Data for Name: championships; Type: TABLE DATA; Schema: public; Owner: willianlima
--

COPY public.championships (id, name, slug, season, country, logo_url, is_active, start_date, end_date, created_at) FROM stdin;
bdc291fb-5642-4e39-920c-a1f38423e3d3	Brasileirão Série A 2026	brasileirao-serie-a-2026	2026	Brasil	\N	t	2026-04-05 00:00:00	2026-12-07 00:00:00	2026-04-06 21:59:16.481
43ee45b7-e703-48bf-a712-d45ee98f61ba	Copa do Brasil 2026	copa-do-brasil-2026	2026	Brasil	\N	t	2026-02-05 00:00:00	2026-11-15 00:00:00	2026-04-06 21:59:16.482
\.


--
-- Data for Name: match_result_history; Type: TABLE DATA; Schema: public; Owner: willianlima
--

COPY public.match_result_history (id, match_id, admin_user_id, "prevHome", "prevAway", "newHome", "newAway", created_at) FROM stdin;
6b12c946-f246-4da2-9bb7-43f5727487d8	19382877-5a9b-4b02-88b3-11ab41377c28	8a36dcce-075f-4835-b3c4-bbf56b838a6e	2	1	2	2	2026-04-28 01:16:27.02
ff583fba-2ca8-4796-94df-363f5032c0a3	19382877-5a9b-4b02-88b3-11ab41377c28	8a36dcce-075f-4835-b3c4-bbf56b838a6e	2	2	2	36	2026-04-28 01:16:44.475
2c9a5fb6-b685-4b7f-94f9-11e2b969fdff	19382877-5a9b-4b02-88b3-11ab41377c28	8a36dcce-075f-4835-b3c4-bbf56b838a6e	2	36	2	2	2026-04-28 01:16:51.384
3b6e31f1-c5a6-4c0c-a027-bf6829bbcdf1	0c2f91e1-1ef8-4c0a-b721-1cf3bf1e16ec	8a36dcce-075f-4835-b3c4-bbf56b838a6e	2	1	2	2	2026-04-28 01:22:25.565
e921fd74-6d87-417c-998d-719ef39bab43	0c2f91e1-1ef8-4c0a-b721-1cf3bf1e16ec	8a36dcce-075f-4835-b3c4-bbf56b838a6e	2	2	2	1	2026-04-28 01:23:09.784
850ec1eb-12b5-453a-8f1a-1e680b1bc63f	19382877-5a9b-4b02-88b3-11ab41377c28	8a36dcce-075f-4835-b3c4-bbf56b838a6e	2	2	3	2	2026-04-28 18:13:51.813
64d25f51-4587-436d-916f-4c8982778a3a	19382877-5a9b-4b02-88b3-11ab41377c28	8a36dcce-075f-4835-b3c4-bbf56b838a6e	3	2	2	2	2026-04-28 18:14:06.558
76eada38-7511-405c-b17b-bb4821fba225	19382877-5a9b-4b02-88b3-11ab41377c28	8a36dcce-075f-4835-b3c4-bbf56b838a6e	2	2	4	2	2026-04-28 18:24:36.731
2cfa5889-c9f7-403a-841b-0501116502cf	19382877-5a9b-4b02-88b3-11ab41377c28	8a36dcce-075f-4835-b3c4-bbf56b838a6e	4	2	2	2	2026-04-28 19:33:54.974
72be5159-8ad7-4ab0-968b-18942179aac8	19382877-5a9b-4b02-88b3-11ab41377c28	8a36dcce-075f-4835-b3c4-bbf56b838a6e	2	2	4	2	2026-04-28 19:49:10.73
e8f4ea5d-facd-455c-9ee9-64e14e3317c1	19382877-5a9b-4b02-88b3-11ab41377c28	8a36dcce-075f-4835-b3c4-bbf56b838a6e	4	2	2	2	2026-04-28 20:29:57.828
\.


--
-- Data for Name: matches; Type: TABLE DATA; Schema: public; Owner: willianlima
--

COPY public.matches (id, round_id, home_team, away_team, home_score, away_score, status, match_date, venue, created_at, updated_at, is_joker, external_match_id, is_manual_override) FROM stdin;
a2eb4fe1-433d-4903-a9d3-61a49e1d5dfe	ddeaf21a-fb74-4a98-8474-efa20301a66d	EC Bahia	Chapecoense AF	\N	\N	SCHEDULED	2026-02-25 00:00:00	\N	2026-04-22 17:18:00.115	2026-04-22 17:18:00.115	f	554770	f
bdf783b6-2567-4c80-8a75-42a784dfa5fd	0f4da641-bbf8-46f9-b2f6-6f321a5508b3	Botafogo FR	Clube do Remo	\N	\N	SCHEDULED	2026-05-02 19:00:00	\N	2026-04-24 17:54:22.378	2026-04-24 17:54:22.378	f	554871	f
bf3359ed-f3ed-4729-85ed-9687abf750ea	0f4da641-bbf8-46f9-b2f6-6f321a5508b3	SE Palmeiras	Santos FC	\N	\N	SCHEDULED	2026-05-02 21:30:00	\N	2026-04-24 17:54:22.38	2026-04-24 17:54:22.38	f	554877	f
d013605a-60ce-4e80-9259-fb664e4902ef	0f4da641-bbf8-46f9-b2f6-6f321a5508b3	EC Vitória	Coritiba FBC	\N	\N	SCHEDULED	2026-05-02 21:30:00	\N	2026-04-24 17:54:22.381	2026-04-24 17:54:22.381	f	554879	f
f646f66b-de5f-4713-88ec-29f7c228a059	ddeaf21a-fb74-4a98-8474-efa20301a66d	Botafogo FR	EC Vitória	\N	\N	SCHEDULED	2026-02-25 00:00:00	\N	2026-04-22 17:18:00.121	2026-04-22 17:18:00.121	f	554771	f
b4001433-0761-429a-885d-617a4913f8d2	ddeaf21a-fb74-4a98-8474-efa20301a66d	CR Flamengo	Mirassol FC	\N	\N	SCHEDULED	2026-02-25 00:00:00	\N	2026-04-22 17:18:00.123	2026-04-22 17:18:00.123	f	554775	f
f5f15ac1-5b7e-48ac-a088-c2354d635539	0f4da641-bbf8-46f9-b2f6-6f321a5508b3	CA Paranaense	Grêmio FBPA	\N	\N	SCHEDULED	2026-05-02 23:30:00	\N	2026-04-24 17:54:22.383	2026-04-24 17:54:22.383	f	554870	f
a8733cb2-1e63-4933-8dee-095019687835	0f4da641-bbf8-46f9-b2f6-6f321a5508b3	Cruzeiro EC	CA Mineiro	\N	\N	SCHEDULED	2026-05-03 00:00:00	\N	2026-04-24 17:54:22.385	2026-04-24 17:54:22.385	f	554873	f
5aeff406-b88e-47e3-962a-3a68ce8e6680	0f4da641-bbf8-46f9-b2f6-6f321a5508b3	CR Flamengo	CR Vasco da Gama	\N	\N	SCHEDULED	2026-05-03 19:00:00	\N	2026-04-24 17:54:22.387	2026-04-24 17:54:22.387	f	554874	f
28e4885c-fe0e-42dc-af0f-9ade39d65f09	0f4da641-bbf8-46f9-b2f6-6f321a5508b3	São Paulo FC	EC Bahia	\N	\N	SCHEDULED	2026-05-03 19:00:00	\N	2026-04-24 17:54:22.389	2026-04-24 17:54:22.389	f	554878	f
5bcf9809-cb2c-43b5-b518-56ecf332d619	0f4da641-bbf8-46f9-b2f6-6f321a5508b3	Chapecoense AF	RB Bragantino	\N	\N	SCHEDULED	2026-05-03 21:30:00	\N	2026-04-24 17:54:22.39	2026-04-24 17:54:22.39	f	554872	f
0cbf68ce-8f69-46e4-bf94-5eeeb20daea3	0f4da641-bbf8-46f9-b2f6-6f321a5508b3	SC Internacional	Fluminense FC	\N	\N	SCHEDULED	2026-05-03 21:30:00	\N	2026-04-24 17:54:22.392	2026-04-24 17:54:22.392	f	554875	f
9da028f1-e592-4a70-b3d8-50afb5b7072a	0f4da641-bbf8-46f9-b2f6-6f321a5508b3	Mirassol FC	SC Corinthians Paulista	\N	\N	SCHEDULED	2026-05-03 23:30:00	\N	2026-04-24 17:54:22.393	2026-04-24 17:54:22.393	f	554876	f
4152ad79-2354-4405-8dbb-ffd233d2401a	026507b4-7987-4136-8ee0-190419d9a666	Coritiba FBC	SC Internacional	\N	\N	SCHEDULED	2026-05-09 19:00:00	\N	2026-04-24 17:54:22.395	2026-04-24 17:54:22.395	f	554883	f
c1ac473c-c10b-44a0-bc01-a1189152b5c2	026507b4-7987-4136-8ee0-190419d9a666	Fluminense FC	EC Vitória	\N	\N	SCHEDULED	2026-05-09 21:00:00	\N	2026-04-24 17:54:22.396	2026-04-24 17:54:22.396	f	554884	f
a805b8d5-7f3e-430a-b105-73abcaac962b	026507b4-7987-4136-8ee0-190419d9a666	EC Bahia	Cruzeiro EC	\N	\N	SCHEDULED	2026-05-10 00:00:00	\N	2026-04-24 17:54:22.398	2026-04-24 17:54:22.398	f	554881	f
28ea71e5-bf4b-4a02-a700-84e9fdb7377a	026507b4-7987-4136-8ee0-190419d9a666	CA Mineiro	Botafogo FR	\N	\N	SCHEDULED	2026-05-10 19:00:00	\N	2026-04-24 17:54:22.399	2026-04-24 17:54:22.399	f	554880	f
fea36978-85b7-450f-8c3e-b1f08a1f11ed	026507b4-7987-4136-8ee0-190419d9a666	Clube do Remo	SE Palmeiras	\N	\N	SCHEDULED	2026-05-10 19:00:00	\N	2026-04-24 17:54:22.401	2026-04-24 17:54:22.401	f	554887	f
994ada05-d38d-4921-a2bf-c13d0807010e	026507b4-7987-4136-8ee0-190419d9a666	SC Corinthians Paulista	São Paulo FC	\N	\N	SCHEDULED	2026-05-10 21:30:00	\N	2026-04-24 17:54:22.402	2026-04-24 17:54:22.402	f	554882	f
c02c460f-37ae-4d20-8423-e84bb280a880	026507b4-7987-4136-8ee0-190419d9a666	Mirassol FC	Chapecoense AF	\N	\N	SCHEDULED	2026-05-10 21:30:00	\N	2026-04-24 17:54:22.405	2026-04-24 17:54:22.405	f	554886	f
0ae068cc-99aa-438f-a899-b69050d90d6a	026507b4-7987-4136-8ee0-190419d9a666	Santos FC	RB Bragantino	\N	\N	SCHEDULED	2026-05-10 21:30:00	\N	2026-04-24 17:54:22.407	2026-04-24 17:54:22.407	f	554888	f
050fa01b-e9a5-4c91-a46e-862fb50ce7b5	026507b4-7987-4136-8ee0-190419d9a666	Grêmio FBPA	CR Flamengo	\N	\N	SCHEDULED	2026-05-10 22:30:00	\N	2026-04-24 17:54:22.408	2026-04-24 17:54:22.408	f	554885	f
9cda3026-39dc-4122-9ed7-05489185c71a	026507b4-7987-4136-8ee0-190419d9a666	CR Vasco da Gama	CA Paranaense	\N	\N	SCHEDULED	2026-05-10 23:30:00	\N	2026-04-24 17:54:22.41	2026-04-24 17:54:22.41	f	554889	f
e18599f0-e887-422a-94a2-0c5fe1e8a0f8	938b2909-3c3d-4198-86a5-53f113f75d94	CA Mineiro	Mirassol FC	\N	\N	SCHEDULED	2026-05-16 21:30:00	\N	2026-04-24 17:54:22.412	2026-04-24 17:54:22.412	f	554891	f
248950d5-0791-47af-a2fd-88999b18ded8	938b2909-3c3d-4198-86a5-53f113f75d94	SC Internacional	CR Vasco da Gama	\N	\N	SCHEDULED	2026-05-16 21:30:00	\N	2026-04-24 17:54:22.414	2026-04-24 17:54:22.414	f	554897	f
c2625bf5-dd60-4b14-9448-0828ed2f9542	938b2909-3c3d-4198-86a5-53f113f75d94	Fluminense FC	São Paulo FC	\N	\N	SCHEDULED	2026-05-16 23:30:00	\N	2026-04-24 17:54:22.415	2026-04-24 17:54:22.415	f	554896	f
3715333f-6cfb-457d-bbd9-55bc11281d8f	938b2909-3c3d-4198-86a5-53f113f75d94	SE Palmeiras	Cruzeiro EC	\N	\N	SCHEDULED	2026-05-17 00:00:00	\N	2026-04-24 17:54:22.417	2026-04-24 17:54:22.417	f	554898	f
a607a716-62ea-45c6-8302-760eebacb34e	938b2909-3c3d-4198-86a5-53f113f75d94	Santos FC	Coritiba FBC	\N	\N	SCHEDULED	2026-05-17 14:00:00	\N	2026-04-24 17:54:22.419	2026-04-24 17:54:22.419	f	554899	f
ebe637d0-29f6-4046-8637-93097d7bab69	938b2909-3c3d-4198-86a5-53f113f75d94	EC Bahia	Grêmio FBPA	\N	\N	SCHEDULED	2026-05-17 19:00:00	\N	2026-04-24 17:54:22.421	2026-04-24 17:54:22.421	f	554892	f
72fcdcdb-2bac-416b-a482-0866396a4328	938b2909-3c3d-4198-86a5-53f113f75d94	Botafogo FR	SC Corinthians Paulista	\N	\N	SCHEDULED	2026-05-17 19:00:00	\N	2026-04-24 17:54:22.422	2026-04-24 17:54:22.422	f	554893	f
9d929d97-4899-408d-af76-c6c493f76366	938b2909-3c3d-4198-86a5-53f113f75d94	RB Bragantino	EC Vitória	\N	\N	SCHEDULED	2026-05-17 21:30:00	\N	2026-04-24 17:54:22.423	2026-04-24 17:54:22.423	f	554894	f
e593f38c-447b-43fa-807c-c32ce86f8ff2	938b2909-3c3d-4198-86a5-53f113f75d94	Chapecoense AF	Clube do Remo	\N	\N	SCHEDULED	2026-05-17 21:30:00	\N	2026-04-24 17:54:22.425	2026-04-24 17:54:22.425	f	554895	f
cbe4cba8-3d71-4b7b-ba08-4cc2d4476eda	938b2909-3c3d-4198-86a5-53f113f75d94	CA Paranaense	CR Flamengo	\N	\N	SCHEDULED	2026-05-17 22:30:00	\N	2026-04-24 17:54:22.427	2026-04-24 17:54:22.427	f	554890	f
e092fac5-6ce5-4eae-9424-6d82409fb6ca	af256016-3174-4e4e-bc81-9b4cbd5da959	São Paulo FC	Botafogo FR	\N	\N	SCHEDULED	2026-05-23 20:00:00	\N	2026-04-24 17:54:22.428	2026-04-24 17:54:22.428	f	554907	f
4e74f5df-a5ef-479b-b34d-2471e8d1047d	af256016-3174-4e4e-bc81-9b4cbd5da959	EC Vitória	SC Internacional	\N	\N	SCHEDULED	2026-05-23 20:00:00	\N	2026-04-24 17:54:22.43	2026-04-24 17:54:22.43	f	554909	f
00499cd1-6fce-478c-83af-86a6fee167cc	af256016-3174-4e4e-bc81-9b4cbd5da959	Grêmio FBPA	Santos FC	\N	\N	SCHEDULED	2026-05-23 22:00:00	\N	2026-04-24 17:54:22.431	2026-04-24 17:54:22.431	f	554904	f
19382877-5a9b-4b02-88b3-11ab41377c28	9ad8393a-13a3-4237-ad1f-90521cc1730b	Botafogo FR	SC Internacional	2	2	FINISHED	2026-04-25 21:30:00	\N	2026-04-24 17:54:22.357	2026-04-28 20:29:57.809	f	554863	t
9eb85e53-cb39-439d-9866-801bac0b296e	9ad8393a-13a3-4237-ad1f-90521cc1730b	Clube do Remo	Cruzeiro EC	0	1	FINISHED	2026-04-25 21:30:00	\N	2026-04-24 17:54:22.36	2026-04-25 23:36:01.533	f	554868	f
3100825b-7975-4921-9a08-ec25667da221	9ad8393a-13a3-4237-ad1f-90521cc1730b	EC Bahia	Santos FC	2	2	FINISHED	2026-04-25 21:30:00	\N	2026-04-24 17:54:22.35	2026-04-25 23:44:00.986	f	554862	f
32520618-6623-4393-bc4f-35fc16f0da27	9ad8393a-13a3-4237-ad1f-90521cc1730b	São Paulo FC	Mirassol FC	1	0	FINISHED	2026-04-26 00:00:00	\N	2026-04-24 17:54:22.363	2026-04-26 02:05:01.26	f	554869	f
1a3576d0-d67d-4173-b0cc-5451432e81ad	9ad8393a-13a3-4237-ad1f-90521cc1730b	SC Corinthians Paulista	CR Vasco da Gama	1	0	FINISHED	2026-04-26 19:00:00	\N	2026-04-24 17:54:22.365	2026-04-26 21:15:00.958	f	554865	f
73a369c6-e9fa-4b96-aae2-84e1528b2fb3	9ad8393a-13a3-4237-ad1f-90521cc1730b	CA Mineiro	CR Flamengo	0	4	FINISHED	2026-04-26 23:30:00	\N	2026-04-24 17:54:22.374	2026-04-27 01:31:01.084	f	554861	f
934c5242-6ac9-4ce0-9cd5-5bb004d0fae6	9ad8393a-13a3-4237-ad1f-90521cc1730b	RB Bragantino	SE Palmeiras	0	1	FINISHED	2026-04-26 21:30:00	\N	2026-04-24 17:54:22.373	2026-04-26 23:36:00.982	f	554864	f
a91bae97-881e-48e0-b48d-4c5ebe770a4d	9ad8393a-13a3-4237-ad1f-90521cc1730b	CA Paranaense	EC Vitória	3	1	FINISHED	2026-04-26 21:30:00	\N	2026-04-24 17:54:22.37	2026-04-26 23:37:00.711	f	554860	f
e0a646ac-8c53-4892-8c23-7e594849d4ff	af256016-3174-4e4e-bc81-9b4cbd5da959	Mirassol FC	Fluminense FC	\N	\N	SCHEDULED	2026-05-23 22:00:00	\N	2026-04-24 17:54:22.433	2026-04-24 17:54:22.433	f	554905	f
29d4f192-5557-4a82-95ce-7f553fea84a7	af256016-3174-4e4e-bc81-9b4cbd5da959	CR Flamengo	SE Palmeiras	\N	\N	SCHEDULED	2026-05-24 00:00:00	\N	2026-04-24 17:54:22.436	2026-04-24 17:54:22.436	f	554903	f
6d1bf5e2-e8ff-406d-b52c-20006607dfc4	af256016-3174-4e4e-bc81-9b4cbd5da959	Cruzeiro EC	Chapecoense AF	\N	\N	SCHEDULED	2026-05-24 19:00:00	\N	2026-04-24 17:54:22.438	2026-04-24 17:54:22.438	f	554902	f
93152347-abbe-4c11-bc05-30e4fc974a8e	af256016-3174-4e4e-bc81-9b4cbd5da959	Clube do Remo	CA Paranaense	\N	\N	SCHEDULED	2026-05-24 19:00:00	\N	2026-04-24 17:54:22.439	2026-04-24 17:54:22.439	f	554906	f
253ec81a-d6b4-4e2d-90fe-bcded4e01b79	af256016-3174-4e4e-bc81-9b4cbd5da959	SC Corinthians Paulista	CA Mineiro	\N	\N	SCHEDULED	2026-05-24 21:30:00	\N	2026-04-24 17:54:22.44	2026-04-24 17:54:22.44	f	554900	f
acac6acc-e84e-4146-aec7-54975bb94653	af256016-3174-4e4e-bc81-9b4cbd5da959	CR Vasco da Gama	RB Bragantino	\N	\N	SCHEDULED	2026-05-24 23:30:00	\N	2026-04-24 17:54:22.441	2026-04-24 17:54:22.441	f	554908	f
1b913ff3-a26f-47e6-b526-5cfdc22d4e7d	af256016-3174-4e4e-bc81-9b4cbd5da959	Coritiba FBC	EC Bahia	\N	\N	SCHEDULED	2026-05-25 23:00:00	\N	2026-04-24 17:54:22.443	2026-04-24 17:54:22.443	f	554901	f
65c6b236-0bc0-4f56-ba28-5f8f7a1a8003	3a93b705-1efe-404d-a00a-ffabd146facf	CA Paranaense	Mirassol FC	\N	\N	SCHEDULED	2026-05-30 00:00:00	\N	2026-04-24 17:54:22.444	2026-04-24 17:54:22.444	f	554910	f
fdc169ff-c054-4ca7-9e16-98fadff546a8	3a93b705-1efe-404d-a00a-ffabd146facf	EC Bahia	Botafogo FR	\N	\N	SCHEDULED	2026-05-30 00:00:00	\N	2026-04-24 17:54:22.445	2026-04-24 17:54:22.445	f	554911	f
0dd2f045-08e8-4847-862e-7067f591ef30	3a93b705-1efe-404d-a00a-ffabd146facf	RB Bragantino	SC Internacional	\N	\N	SCHEDULED	2026-05-30 00:00:00	\N	2026-04-24 17:54:22.446	2026-04-24 17:54:22.446	f	554912	f
768024f5-5969-46c7-8b36-232ec807b135	3a93b705-1efe-404d-a00a-ffabd146facf	Cruzeiro EC	Fluminense FC	\N	\N	SCHEDULED	2026-05-30 00:00:00	\N	2026-04-24 17:54:22.447	2026-04-24 17:54:22.447	f	554913	f
2773d774-f55d-4a8d-a094-48a4d0bac52d	3a93b705-1efe-404d-a00a-ffabd146facf	CR Flamengo	Coritiba FBC	\N	\N	SCHEDULED	2026-05-30 00:00:00	\N	2026-04-24 17:54:22.449	2026-04-24 17:54:22.449	f	554914	f
ff353eae-4a3d-439a-830c-734b515f1130	3a93b705-1efe-404d-a00a-ffabd146facf	Grêmio FBPA	SC Corinthians Paulista	\N	\N	SCHEDULED	2026-05-30 00:00:00	\N	2026-04-24 17:54:22.45	2026-04-24 17:54:22.45	f	554915	f
efe00095-2a42-4122-b57c-977631449495	3a93b705-1efe-404d-a00a-ffabd146facf	SE Palmeiras	Chapecoense AF	\N	\N	SCHEDULED	2026-05-30 00:00:00	\N	2026-04-24 17:54:22.451	2026-04-24 17:54:22.451	f	554916	f
a7fb2910-432c-4206-a9ec-8025118e527d	3a93b705-1efe-404d-a00a-ffabd146facf	Clube do Remo	São Paulo FC	\N	\N	SCHEDULED	2026-05-30 00:00:00	\N	2026-04-24 17:54:22.452	2026-04-24 17:54:22.452	f	554917	f
32af3258-225b-4757-839f-cad55740dddb	3a93b705-1efe-404d-a00a-ffabd146facf	Santos FC	EC Vitória	\N	\N	SCHEDULED	2026-05-30 00:00:00	\N	2026-04-24 17:54:22.453	2026-04-24 17:54:22.453	f	554918	f
1b067093-8223-434e-be9f-741c7ab0809c	3a93b705-1efe-404d-a00a-ffabd146facf	CR Vasco da Gama	CA Mineiro	\N	\N	SCHEDULED	2026-05-30 00:00:00	\N	2026-04-24 17:54:22.454	2026-04-24 17:54:22.454	f	554919	f
285a51d2-ebe5-4258-a024-8b92679c6ee5	c541dd92-68bc-4d42-86d3-c5babdb65757	CA Mineiro	EC Bahia	\N	\N	SCHEDULED	2026-07-22 00:00:00	\N	2026-04-24 17:54:22.455	2026-04-24 17:54:22.455	f	554920	f
32d6883c-fd56-4984-b383-0679e8364178	c541dd92-68bc-4d42-86d3-c5babdb65757	Botafogo FR	Santos FC	\N	\N	SCHEDULED	2026-07-22 00:00:00	\N	2026-04-24 17:54:22.456	2026-04-24 17:54:22.456	f	554921	f
080e1569-8905-4039-a179-ccfa664b1ea9	c541dd92-68bc-4d42-86d3-c5babdb65757	Chapecoense AF	CR Flamengo	\N	\N	SCHEDULED	2026-07-22 00:00:00	\N	2026-04-24 17:54:22.457	2026-04-24 17:54:22.457	f	554922	f
3032f5cd-9f26-4eac-9259-ac85b5833b2e	c541dd92-68bc-4d42-86d3-c5babdb65757	SC Corinthians Paulista	Clube do Remo	\N	\N	SCHEDULED	2026-07-22 00:00:00	\N	2026-04-24 17:54:22.458	2026-04-24 17:54:22.458	f	554923	f
b7598a41-2d7c-4c45-bc0d-c6318cb479df	c541dd92-68bc-4d42-86d3-c5babdb65757	Coritiba FBC	SE Palmeiras	\N	\N	SCHEDULED	2026-07-22 00:00:00	\N	2026-04-24 17:54:22.459	2026-04-24 17:54:22.459	f	554924	f
cf6fac3d-2cd7-411d-a67a-04d06b4b7762	c541dd92-68bc-4d42-86d3-c5babdb65757	Fluminense FC	RB Bragantino	\N	\N	SCHEDULED	2026-07-22 00:00:00	\N	2026-04-24 17:54:22.46	2026-04-24 17:54:22.46	f	554925	f
657d3b75-099b-422a-bca6-1b3dfb35cfed	c541dd92-68bc-4d42-86d3-c5babdb65757	SC Internacional	Cruzeiro EC	\N	\N	SCHEDULED	2026-07-22 00:00:00	\N	2026-04-24 17:54:22.461	2026-04-24 17:54:22.461	f	554926	f
1eaf41e8-185e-462b-b4a8-16232a86aabd	c541dd92-68bc-4d42-86d3-c5babdb65757	Mirassol FC	Grêmio FBPA	\N	\N	SCHEDULED	2026-07-22 00:00:00	\N	2026-04-24 17:54:22.462	2026-04-24 17:54:22.462	f	554927	f
4b4e5b2a-50ac-4bed-b3a5-d6e6c1afed04	c541dd92-68bc-4d42-86d3-c5babdb65757	São Paulo FC	CA Paranaense	\N	\N	SCHEDULED	2026-07-22 00:00:00	\N	2026-04-24 17:54:22.462	2026-04-24 17:54:22.462	f	554928	f
9496509b-f902-485e-914a-73be5a7727cd	c541dd92-68bc-4d42-86d3-c5babdb65757	EC Vitória	CR Vasco da Gama	\N	\N	SCHEDULED	2026-07-22 00:00:00	\N	2026-04-24 17:54:22.463	2026-04-24 17:54:22.463	f	554929	f
cd6b90cf-0572-41c0-864d-bcac6b4dfc04	f2d14b6d-cec6-477c-9f20-d3b82bf0d51b	CA Paranaense	SC Internacional	\N	\N	SCHEDULED	2026-07-25 00:00:00	\N	2026-04-24 17:54:22.464	2026-04-24 17:54:22.464	f	554930	f
6ce90ff0-2915-4fc6-8e2f-0d868c288d57	f2d14b6d-cec6-477c-9f20-d3b82bf0d51b	EC Bahia	SC Corinthians Paulista	\N	\N	SCHEDULED	2026-07-25 00:00:00	\N	2026-04-24 17:54:22.465	2026-04-24 17:54:22.465	f	554931	f
4b580f34-ec34-4fac-8f87-2876e118e8e5	f2d14b6d-cec6-477c-9f20-d3b82bf0d51b	RB Bragantino	Coritiba FBC	\N	\N	SCHEDULED	2026-07-25 00:00:00	\N	2026-04-24 17:54:22.466	2026-04-24 17:54:22.466	f	554932	f
531c93a3-213d-472a-b1b2-e253f168f192	f2d14b6d-cec6-477c-9f20-d3b82bf0d51b	Cruzeiro EC	Botafogo FR	\N	\N	SCHEDULED	2026-07-25 00:00:00	\N	2026-04-24 17:54:22.467	2026-04-24 17:54:22.467	f	554933	f
693946d7-48d4-4f27-b5e0-c25a37b060f4	f2d14b6d-cec6-477c-9f20-d3b82bf0d51b	CR Flamengo	São Paulo FC	\N	\N	SCHEDULED	2026-07-25 00:00:00	\N	2026-04-24 17:54:22.468	2026-04-24 17:54:22.468	f	554934	f
122b3cc5-fbf7-4153-8883-b66873a94c25	f2d14b6d-cec6-477c-9f20-d3b82bf0d51b	Grêmio FBPA	Fluminense FC	\N	\N	SCHEDULED	2026-07-25 00:00:00	\N	2026-04-24 17:54:22.469	2026-04-24 17:54:22.469	f	554935	f
3c1c0a09-eaab-4080-a011-7b26b32c52d4	f2d14b6d-cec6-477c-9f20-d3b82bf0d51b	SE Palmeiras	CA Mineiro	\N	\N	SCHEDULED	2026-07-25 00:00:00	\N	2026-04-24 17:54:22.471	2026-04-24 17:54:22.471	f	554936	f
2cd9e681-8acc-4f02-ae46-9b0b7987a7cb	f2d14b6d-cec6-477c-9f20-d3b82bf0d51b	Clube do Remo	EC Vitória	\N	\N	SCHEDULED	2026-07-25 00:00:00	\N	2026-04-24 17:54:22.472	2026-04-24 17:54:22.472	f	554937	f
99afd4df-5fbe-46a8-a200-82a652332d73	f2d14b6d-cec6-477c-9f20-d3b82bf0d51b	Santos FC	Chapecoense AF	\N	\N	SCHEDULED	2026-07-25 00:00:00	\N	2026-04-24 17:54:22.472	2026-04-24 17:54:22.472	f	554938	f
888f701a-f8d1-473d-a467-2edc39ca2c2c	f2d14b6d-cec6-477c-9f20-d3b82bf0d51b	CR Vasco da Gama	Mirassol FC	\N	\N	SCHEDULED	2026-07-25 00:00:00	\N	2026-04-24 17:54:22.473	2026-04-24 17:54:22.473	f	554939	f
f4c9ae5e-cc05-45e6-8df3-a009145ffb82	97fb39bf-eadb-4715-a076-13b30710949d	CA Mineiro	RB Bragantino	\N	\N	SCHEDULED	2026-07-29 00:00:00	\N	2026-04-24 17:54:22.474	2026-04-24 17:54:22.474	f	554940	f
0965f2ac-2d3d-4dcd-8455-27b2cf9618d4	97fb39bf-eadb-4715-a076-13b30710949d	Botafogo FR	Grêmio FBPA	\N	\N	SCHEDULED	2026-07-29 00:00:00	\N	2026-04-24 17:54:22.475	2026-04-24 17:54:22.475	f	554941	f
25e8ac5f-539b-464e-b538-7d29cf030da4	97fb39bf-eadb-4715-a076-13b30710949d	Chapecoense AF	CR Vasco da Gama	\N	\N	SCHEDULED	2026-07-29 00:00:00	\N	2026-04-24 17:54:22.476	2026-04-24 17:54:22.476	f	554942	f
290845f1-1d1d-4bfe-af3e-6a8586019808	97fb39bf-eadb-4715-a076-13b30710949d	SC Corinthians Paulista	CA Paranaense	\N	\N	SCHEDULED	2026-07-29 00:00:00	\N	2026-04-24 17:54:22.477	2026-04-24 17:54:22.477	f	554943	f
75cf0a03-d425-4bd6-8647-690b54bd7f14	97fb39bf-eadb-4715-a076-13b30710949d	Coritiba FBC	Cruzeiro EC	\N	\N	SCHEDULED	2026-07-29 00:00:00	\N	2026-04-24 17:54:22.478	2026-04-24 17:54:22.478	f	554944	f
98547baa-4918-40ec-b565-38bbb89b2872	97fb39bf-eadb-4715-a076-13b30710949d	Fluminense FC	EC Bahia	\N	\N	SCHEDULED	2026-07-29 00:00:00	\N	2026-04-24 17:54:22.479	2026-04-24 17:54:22.479	f	554945	f
0bcc8c5f-36ca-4e6a-8abf-fc3cdb16e5f0	97fb39bf-eadb-4715-a076-13b30710949d	SC Internacional	CR Flamengo	\N	\N	SCHEDULED	2026-07-29 00:00:00	\N	2026-04-24 17:54:22.48	2026-04-24 17:54:22.48	f	554946	f
468a3843-a0f0-47e0-a5e4-0543f0108cf3	97fb39bf-eadb-4715-a076-13b30710949d	Mirassol FC	Clube do Remo	\N	\N	SCHEDULED	2026-07-29 00:00:00	\N	2026-04-24 17:54:22.481	2026-04-24 17:54:22.481	f	554947	f
5f29a8d7-4cef-4e6a-a531-14ceb7c4d3aa	97fb39bf-eadb-4715-a076-13b30710949d	São Paulo FC	Santos FC	\N	\N	SCHEDULED	2026-07-29 00:00:00	\N	2026-04-24 17:54:22.482	2026-04-24 17:54:22.482	f	554948	f
25bd49cd-1b25-4926-982f-3689034bc329	97fb39bf-eadb-4715-a076-13b30710949d	EC Vitória	SE Palmeiras	\N	\N	SCHEDULED	2026-07-29 00:00:00	\N	2026-04-24 17:54:22.483	2026-04-24 17:54:22.483	f	554949	f
28c9f4e5-919f-46a9-988c-481de3ec62e4	6e91ad80-1f0f-49e3-a1bf-76d12c897635	EC Bahia	CR Vasco da Gama	\N	\N	SCHEDULED	2026-08-08 00:00:00	\N	2026-04-24 17:54:22.484	2026-04-24 17:54:22.484	f	554950	f
63784e99-47a9-4686-8b4a-611601bec4d8	6e91ad80-1f0f-49e3-a1bf-76d12c897635	Botafogo FR	Fluminense FC	\N	\N	SCHEDULED	2026-08-08 00:00:00	\N	2026-04-24 17:54:22.485	2026-04-24 17:54:22.485	f	554951	f
9b957d80-e7aa-4509-b2f0-b7790fb81ae2	6e91ad80-1f0f-49e3-a1bf-76d12c897635	RB Bragantino	SC Corinthians Paulista	\N	\N	SCHEDULED	2026-08-08 00:00:00	\N	2026-04-24 17:54:22.486	2026-04-24 17:54:22.486	f	554952	f
00a80a80-9cad-41f5-857d-0e851057dfea	6e91ad80-1f0f-49e3-a1bf-76d12c897635	Coritiba FBC	Chapecoense AF	\N	\N	SCHEDULED	2026-08-08 00:00:00	\N	2026-04-24 17:54:22.487	2026-04-24 17:54:22.487	f	554953	f
decc2261-eb9b-4f21-bb80-57b857bedc02	6e91ad80-1f0f-49e3-a1bf-76d12c897635	Cruzeiro EC	Mirassol FC	\N	\N	SCHEDULED	2026-08-08 00:00:00	\N	2026-04-24 17:54:22.488	2026-04-24 17:54:22.488	f	554954	f
f0e7d132-cfc4-4fb7-977c-44469f323409	6e91ad80-1f0f-49e3-a1bf-76d12c897635	CR Flamengo	EC Vitória	\N	\N	SCHEDULED	2026-08-08 00:00:00	\N	2026-04-24 17:54:22.489	2026-04-24 17:54:22.489	f	554955	f
370cc6f5-1ebe-4534-aa8a-465a37c1acb0	6e91ad80-1f0f-49e3-a1bf-76d12c897635	Grêmio FBPA	São Paulo FC	\N	\N	SCHEDULED	2026-08-08 00:00:00	\N	2026-04-24 17:54:22.49	2026-04-24 17:54:22.49	f	554956	f
97a81950-66e8-48db-b2f8-35a46bc4aa1a	6e91ad80-1f0f-49e3-a1bf-76d12c897635	SE Palmeiras	SC Internacional	\N	\N	SCHEDULED	2026-08-08 00:00:00	\N	2026-04-24 17:54:22.491	2026-04-24 17:54:22.491	f	554957	f
2ec011c0-9689-4340-a734-cd84c30b1d1a	6e91ad80-1f0f-49e3-a1bf-76d12c897635	Clube do Remo	CA Mineiro	\N	\N	SCHEDULED	2026-08-08 00:00:00	\N	2026-04-24 17:54:22.492	2026-04-24 17:54:22.492	f	554958	f
ffe8b709-63ad-4692-9e57-3a11a31f3475	6e91ad80-1f0f-49e3-a1bf-76d12c897635	Santos FC	CA Paranaense	\N	\N	SCHEDULED	2026-08-08 00:00:00	\N	2026-04-24 17:54:22.493	2026-04-24 17:54:22.493	f	554959	f
c9f778c4-a8e2-459f-8d2e-62f9425f8c4d	12eefa79-d996-4bd2-b570-0712f479bd2b	CA Paranaense	RB Bragantino	\N	\N	SCHEDULED	2026-08-15 00:00:00	\N	2026-04-24 17:54:22.494	2026-04-24 17:54:22.494	f	554960	f
f19c514e-4370-48aa-8b99-96fbcc332542	12eefa79-d996-4bd2-b570-0712f479bd2b	CA Mineiro	Grêmio FBPA	\N	\N	SCHEDULED	2026-08-15 00:00:00	\N	2026-04-24 17:54:22.495	2026-04-24 17:54:22.495	f	554961	f
1f37be6b-c31f-4746-b6e0-aba630a25c4b	12eefa79-d996-4bd2-b570-0712f479bd2b	Chapecoense AF	EC Bahia	\N	\N	SCHEDULED	2026-08-15 00:00:00	\N	2026-04-24 17:54:22.496	2026-04-24 17:54:22.496	f	554962	f
0be7c36f-b542-4650-9a56-744fb764cf00	12eefa79-d996-4bd2-b570-0712f479bd2b	SC Corinthians Paulista	Cruzeiro EC	\N	\N	SCHEDULED	2026-08-15 00:00:00	\N	2026-04-24 17:54:22.497	2026-04-24 17:54:22.497	f	554963	f
daef88b0-dad8-4246-a162-991b451b911d	12eefa79-d996-4bd2-b570-0712f479bd2b	Fluminense FC	SE Palmeiras	\N	\N	SCHEDULED	2026-08-15 00:00:00	\N	2026-04-24 17:54:22.498	2026-04-24 17:54:22.498	f	554964	f
747a4bab-1b69-456c-8f36-d66605247ccf	12eefa79-d996-4bd2-b570-0712f479bd2b	SC Internacional	Clube do Remo	\N	\N	SCHEDULED	2026-08-15 00:00:00	\N	2026-04-24 17:54:22.499	2026-04-24 17:54:22.499	f	554965	f
2ddc4d77-b9ca-42b3-acb5-968e64e953a8	12eefa79-d996-4bd2-b570-0712f479bd2b	Mirassol FC	CR Flamengo	\N	\N	SCHEDULED	2026-08-15 00:00:00	\N	2026-04-24 17:54:22.499	2026-04-24 17:54:22.499	f	554966	f
18061158-e54a-4c1b-b3ab-596a567dd46c	12eefa79-d996-4bd2-b570-0712f479bd2b	São Paulo FC	Coritiba FBC	\N	\N	SCHEDULED	2026-08-15 00:00:00	\N	2026-04-24 17:54:22.5	2026-04-24 17:54:22.5	f	554967	f
43ebbbd6-6502-4c10-ad1d-4a57156d5524	12eefa79-d996-4bd2-b570-0712f479bd2b	CR Vasco da Gama	Santos FC	\N	\N	SCHEDULED	2026-08-15 00:00:00	\N	2026-04-24 17:54:22.502	2026-04-24 17:54:22.502	f	554968	f
9bfd8dbb-6fb2-4199-8534-6250a6f814a7	12eefa79-d996-4bd2-b570-0712f479bd2b	EC Vitória	Botafogo FR	\N	\N	SCHEDULED	2026-08-15 00:00:00	\N	2026-04-24 17:54:22.503	2026-04-24 17:54:22.503	f	554969	f
1a39a851-76ed-4d60-a271-7a85aa2c670e	e2aaeb58-0edb-43df-93ff-8f55c976b5b2	Botafogo FR	CA Paranaense	\N	\N	SCHEDULED	2026-08-22 00:00:00	\N	2026-04-24 17:54:22.504	2026-04-24 17:54:22.504	f	554970	f
45d13ac9-27a1-46fb-9d40-6836f4343698	e2aaeb58-0edb-43df-93ff-8f55c976b5b2	RB Bragantino	Grêmio FBPA	\N	\N	SCHEDULED	2026-08-22 00:00:00	\N	2026-04-24 17:54:22.505	2026-04-24 17:54:22.505	f	554971	f
ba4e86e7-fbe9-4f9c-a92e-9056376dc1d1	e2aaeb58-0edb-43df-93ff-8f55c976b5b2	Chapecoense AF	São Paulo FC	\N	\N	SCHEDULED	2026-08-22 00:00:00	\N	2026-04-24 17:54:22.506	2026-04-24 17:54:22.506	f	554972	f
67931e84-0fe6-4105-9be4-98dc4b1db0fa	e2aaeb58-0edb-43df-93ff-8f55c976b5b2	Coritiba FBC	SC Corinthians Paulista	\N	\N	SCHEDULED	2026-08-22 00:00:00	\N	2026-04-24 17:54:22.506	2026-04-24 17:54:22.506	f	554973	f
2d106a76-610b-4e05-9b3a-11c9b6bc7240	e2aaeb58-0edb-43df-93ff-8f55c976b5b2	Cruzeiro EC	CR Flamengo	\N	\N	SCHEDULED	2026-08-22 00:00:00	\N	2026-04-24 17:54:22.507	2026-04-24 17:54:22.507	f	554974	f
87f1401e-bc8f-4934-a197-be29f739d6be	e2aaeb58-0edb-43df-93ff-8f55c976b5b2	Fluminense FC	Clube do Remo	\N	\N	SCHEDULED	2026-08-22 00:00:00	\N	2026-04-24 17:54:22.508	2026-04-24 17:54:22.508	f	554975	f
4a0afebf-5d20-478a-b8c5-dd51ffc2f0eb	e2aaeb58-0edb-43df-93ff-8f55c976b5b2	SC Internacional	CA Mineiro	\N	\N	SCHEDULED	2026-08-22 00:00:00	\N	2026-04-24 17:54:22.509	2026-04-24 17:54:22.509	f	554976	f
e8ef237c-1275-42d8-b1d0-f6d98d178729	e2aaeb58-0edb-43df-93ff-8f55c976b5b2	SE Palmeiras	CR Vasco da Gama	\N	\N	SCHEDULED	2026-08-22 00:00:00	\N	2026-04-24 17:54:22.51	2026-04-24 17:54:22.51	f	554977	f
ce3e4cd5-b4ee-4c22-a9f0-8a68fcce72b3	e2aaeb58-0edb-43df-93ff-8f55c976b5b2	Santos FC	Mirassol FC	\N	\N	SCHEDULED	2026-08-22 00:00:00	\N	2026-04-24 17:54:22.51	2026-04-24 17:54:22.51	f	554978	f
f1babe62-75a9-45c7-aecb-02a413094ebc	e2aaeb58-0edb-43df-93ff-8f55c976b5b2	EC Vitória	EC Bahia	\N	\N	SCHEDULED	2026-08-22 00:00:00	\N	2026-04-24 17:54:22.511	2026-04-24 17:54:22.511	f	554979	f
3a4c2488-a02d-4def-bcb4-d36995cc649e	934521cd-ca83-4c19-8a8f-7b562794a915	CA Paranaense	Fluminense FC	\N	\N	SCHEDULED	2026-08-29 00:00:00	\N	2026-04-24 17:54:22.512	2026-04-24 17:54:22.512	f	554980	f
2c42092a-ff51-488d-a970-eddf3f2f5d23	934521cd-ca83-4c19-8a8f-7b562794a915	CA Mineiro	EC Vitória	\N	\N	SCHEDULED	2026-08-29 00:00:00	\N	2026-04-24 17:54:22.513	2026-04-24 17:54:22.513	f	554981	f
a096e73d-5a2c-472c-8349-a1efcf160ff3	934521cd-ca83-4c19-8a8f-7b562794a915	EC Bahia	SC Internacional	\N	\N	SCHEDULED	2026-08-29 00:00:00	\N	2026-04-24 17:54:22.514	2026-04-24 17:54:22.514	f	554982	f
25f83fb7-d663-4318-b379-3855bd0ad625	934521cd-ca83-4c19-8a8f-7b562794a915	SC Corinthians Paulista	Santos FC	\N	\N	SCHEDULED	2026-08-29 00:00:00	\N	2026-04-24 17:54:22.514	2026-04-24 17:54:22.514	f	554983	f
43b3084d-9173-4050-940f-24e28a2875b9	934521cd-ca83-4c19-8a8f-7b562794a915	CR Flamengo	Botafogo FR	\N	\N	SCHEDULED	2026-08-29 00:00:00	\N	2026-04-24 17:54:22.515	2026-04-24 17:54:22.515	f	554984	f
ca3b2f2d-f996-42b6-9aff-be35c74952c5	934521cd-ca83-4c19-8a8f-7b562794a915	Grêmio FBPA	Chapecoense AF	\N	\N	SCHEDULED	2026-08-29 00:00:00	\N	2026-04-24 17:54:22.516	2026-04-24 17:54:22.516	f	554985	f
c5cb6ec3-32ee-4610-8d4a-8a6b48e2173f	934521cd-ca83-4c19-8a8f-7b562794a915	Mirassol FC	SE Palmeiras	\N	\N	SCHEDULED	2026-08-29 00:00:00	\N	2026-04-24 17:54:22.516	2026-04-24 17:54:22.516	f	554986	f
5212a4dd-1e9f-4624-80b6-cf51f772c79b	934521cd-ca83-4c19-8a8f-7b562794a915	Clube do Remo	Coritiba FBC	\N	\N	SCHEDULED	2026-08-29 00:00:00	\N	2026-04-24 17:54:22.517	2026-04-24 17:54:22.517	f	554987	f
4bbd770f-162d-4190-8e33-b00b0cde5dcf	934521cd-ca83-4c19-8a8f-7b562794a915	São Paulo FC	RB Bragantino	\N	\N	SCHEDULED	2026-08-29 00:00:00	\N	2026-04-24 17:54:22.518	2026-04-24 17:54:22.518	f	554988	f
bf3962f6-bacd-4d71-9011-8c81eca0606b	934521cd-ca83-4c19-8a8f-7b562794a915	CR Vasco da Gama	Cruzeiro EC	\N	\N	SCHEDULED	2026-08-29 00:00:00	\N	2026-04-24 17:54:22.518	2026-04-24 17:54:22.518	f	554989	f
b59ff56a-e460-4aad-9296-ff89e388f594	8f8f77d2-fc6f-430f-841d-b3d44b9cf22b	Botafogo FR	SE Palmeiras	\N	\N	SCHEDULED	2026-09-05 00:00:00	\N	2026-04-24 17:54:22.519	2026-04-24 17:54:22.519	f	554990	f
0ae48fbc-ce8c-46bb-9425-20d90aa8e1d6	8f8f77d2-fc6f-430f-841d-b3d44b9cf22b	RB Bragantino	EC Bahia	\N	\N	SCHEDULED	2026-09-05 00:00:00	\N	2026-04-24 17:54:22.52	2026-04-24 17:54:22.52	f	554991	f
75ab3b0b-79f8-4b32-b26f-ff6580a5a9a3	8f8f77d2-fc6f-430f-841d-b3d44b9cf22b	SC Corinthians Paulista	Chapecoense AF	\N	\N	SCHEDULED	2026-09-05 00:00:00	\N	2026-04-24 17:54:22.521	2026-04-24 17:54:22.521	f	554992	f
ff6d7d96-0d81-45fc-b081-f2cb77a85ae2	8f8f77d2-fc6f-430f-841d-b3d44b9cf22b	Coritiba FBC	Mirassol FC	\N	\N	SCHEDULED	2026-09-05 00:00:00	\N	2026-04-24 17:54:22.522	2026-04-24 17:54:22.522	f	554993	f
c3df64f7-f290-4fb3-8a1a-50d50cad0ba1	8f8f77d2-fc6f-430f-841d-b3d44b9cf22b	Cruzeiro EC	CA Paranaense	\N	\N	SCHEDULED	2026-09-05 00:00:00	\N	2026-04-24 17:54:22.523	2026-04-24 17:54:22.523	f	554994	f
a8c97a43-f9c2-4048-b1aa-78fd4e7132d2	8f8f77d2-fc6f-430f-841d-b3d44b9cf22b	Fluminense FC	CR Vasco da Gama	\N	\N	SCHEDULED	2026-09-05 00:00:00	\N	2026-04-24 17:54:22.523	2026-04-24 17:54:22.523	f	554995	f
06098f8b-178b-44c9-88c8-f4ecd4fc6c91	8f8f77d2-fc6f-430f-841d-b3d44b9cf22b	SC Internacional	Santos FC	\N	\N	SCHEDULED	2026-09-05 00:00:00	\N	2026-04-24 17:54:22.524	2026-04-24 17:54:22.524	f	554996	f
53642fde-5ce0-4d96-8500-3b07da753f01	8f8f77d2-fc6f-430f-841d-b3d44b9cf22b	Clube do Remo	CR Flamengo	\N	\N	SCHEDULED	2026-09-05 00:00:00	\N	2026-04-24 17:54:22.525	2026-04-24 17:54:22.525	f	554997	f
69149666-e6ee-4714-bbff-6e3b18620af2	8f8f77d2-fc6f-430f-841d-b3d44b9cf22b	São Paulo FC	CA Mineiro	\N	\N	SCHEDULED	2026-09-05 00:00:00	\N	2026-04-24 17:54:22.526	2026-04-24 17:54:22.526	f	554998	f
542de643-6e85-4c6f-8cd6-93b2c66dd277	8f8f77d2-fc6f-430f-841d-b3d44b9cf22b	EC Vitória	Grêmio FBPA	\N	\N	SCHEDULED	2026-09-05 00:00:00	\N	2026-04-24 17:54:22.526	2026-04-24 17:54:22.526	f	554999	f
d5d82e3f-acfe-499e-bf89-a57b9b9a112a	a394d871-b2a3-4c61-af6b-0a824e5a5ba2	SE Palmeiras	São Paulo FC	\N	\N	SCHEDULED	2026-09-12 00:00:00	\N	2026-04-24 17:54:22.527	2026-04-24 17:54:22.527	f	555008	f
af76aa3f-2694-497f-8baf-4d58ecc23820	a394d871-b2a3-4c61-af6b-0a824e5a5ba2	Santos FC	Cruzeiro EC	\N	\N	SCHEDULED	2026-09-12 00:00:00	\N	2026-04-24 17:54:22.528	2026-04-24 17:54:22.528	f	555009	f
0b36ea15-f577-47d6-b0c6-c7a204a0ff9e	a394d871-b2a3-4c61-af6b-0a824e5a5ba2	CA Mineiro	Fluminense FC	\N	\N	SCHEDULED	2026-09-12 00:00:00	\N	2026-04-24 17:54:22.528	2026-04-24 17:54:22.528	f	555000	f
b771ac43-38dd-411b-8bd0-487e6fa74592	a394d871-b2a3-4c61-af6b-0a824e5a5ba2	EC Bahia	Clube do Remo	\N	\N	SCHEDULED	2026-09-12 00:00:00	\N	2026-04-24 17:54:22.529	2026-04-24 17:54:22.529	f	555001	f
53973d3d-454b-43ee-a998-b47818e47305	a394d871-b2a3-4c61-af6b-0a824e5a5ba2	Botafogo FR	RB Bragantino	\N	\N	SCHEDULED	2026-09-12 00:00:00	\N	2026-04-24 17:54:22.53	2026-04-24 17:54:22.53	f	555002	f
47a27fbd-75bd-4c00-9b81-3678d76311ec	a394d871-b2a3-4c61-af6b-0a824e5a5ba2	Chapecoense AF	SC Internacional	\N	\N	SCHEDULED	2026-09-12 00:00:00	\N	2026-04-24 17:54:22.53	2026-04-24 17:54:22.53	f	555003	f
32d45d5c-c233-45ed-8d5d-c4b9fc0f0ef3	a394d871-b2a3-4c61-af6b-0a824e5a5ba2	Coritiba FBC	CA Paranaense	\N	\N	SCHEDULED	2026-09-12 00:00:00	\N	2026-04-24 17:54:22.531	2026-04-24 17:54:22.531	f	555004	f
67eb41fd-6c7f-4d8d-9cc9-c80da7ede434	a394d871-b2a3-4c61-af6b-0a824e5a5ba2	CR Flamengo	SC Corinthians Paulista	\N	\N	SCHEDULED	2026-09-12 00:00:00	\N	2026-04-24 17:54:22.531	2026-04-24 17:54:22.531	f	555005	f
5556b61b-c348-4c6d-815e-3088859a2c2c	a394d871-b2a3-4c61-af6b-0a824e5a5ba2	Grêmio FBPA	CR Vasco da Gama	\N	\N	SCHEDULED	2026-09-12 00:00:00	\N	2026-04-24 17:54:22.532	2026-04-24 17:54:22.532	f	555006	f
26c18b06-6746-409a-a3bf-5f9bfc20d21e	a394d871-b2a3-4c61-af6b-0a824e5a5ba2	Mirassol FC	EC Vitória	\N	\N	SCHEDULED	2026-09-12 00:00:00	\N	2026-04-24 17:54:22.533	2026-04-24 17:54:22.533	f	555007	f
ca3ccc6d-569d-4238-86f0-0a7a3c35da4b	62e53397-e201-487c-bb76-939cbd98d44e	CA Paranaense	EC Bahia	\N	\N	SCHEDULED	2026-09-19 00:00:00	\N	2026-04-24 17:54:22.534	2026-04-24 17:54:22.534	f	555010	f
7016f0ac-c5e2-484a-8b59-57a3de07eaf9	62e53397-e201-487c-bb76-939cbd98d44e	CA Mineiro	Chapecoense AF	\N	\N	SCHEDULED	2026-09-19 00:00:00	\N	2026-04-24 17:54:22.535	2026-04-24 17:54:22.535	f	555011	f
a519a44b-09ea-41a6-9b28-446d854d5339	62e53397-e201-487c-bb76-939cbd98d44e	SC Corinthians Paulista	Fluminense FC	\N	\N	SCHEDULED	2026-09-19 00:00:00	\N	2026-04-24 17:54:22.536	2026-04-24 17:54:22.536	f	555012	f
08b70b4a-4ae3-45bb-aae6-c979ab78d67c	62e53397-e201-487c-bb76-939cbd98d44e	CR Flamengo	RB Bragantino	\N	\N	SCHEDULED	2026-09-19 00:00:00	\N	2026-04-24 17:54:22.537	2026-04-24 17:54:22.537	f	555013	f
0d93baac-2a5d-44ce-b366-38b21729647c	62e53397-e201-487c-bb76-939cbd98d44e	Grêmio FBPA	SE Palmeiras	\N	\N	SCHEDULED	2026-09-19 00:00:00	\N	2026-04-24 17:54:22.538	2026-04-24 17:54:22.538	f	555014	f
eac1ff00-b997-414d-bbf8-335106a39294	62e53397-e201-487c-bb76-939cbd98d44e	Mirassol FC	Botafogo FR	\N	\N	SCHEDULED	2026-09-19 00:00:00	\N	2026-04-24 17:54:22.539	2026-04-24 17:54:22.539	f	555015	f
f624a119-f85d-42b1-b4f9-e9e29e3ab94c	62e53397-e201-487c-bb76-939cbd98d44e	Clube do Remo	Santos FC	\N	\N	SCHEDULED	2026-09-19 00:00:00	\N	2026-04-24 17:54:22.541	2026-04-24 17:54:22.541	f	555016	f
c4052f84-bf58-4c8d-8c51-33c50a89d85e	62e53397-e201-487c-bb76-939cbd98d44e	São Paulo FC	SC Internacional	\N	\N	SCHEDULED	2026-09-19 00:00:00	\N	2026-04-24 17:54:22.543	2026-04-24 17:54:22.543	f	555017	f
6f2ccfb5-5072-4ba9-84a7-0bc9ba421d0d	62e53397-e201-487c-bb76-939cbd98d44e	CR Vasco da Gama	Coritiba FBC	\N	\N	SCHEDULED	2026-09-19 00:00:00	\N	2026-04-24 17:54:22.544	2026-04-24 17:54:22.544	f	555018	f
e418ec07-217e-42e7-9369-a9a9394c3a6d	62e53397-e201-487c-bb76-939cbd98d44e	EC Vitória	Cruzeiro EC	\N	\N	SCHEDULED	2026-09-19 00:00:00	\N	2026-04-24 17:54:22.544	2026-04-24 17:54:22.544	f	555019	f
f688de69-6b38-4973-8600-3771593eb0aa	b0ab860a-8e72-415e-94f4-9882ab1e70bb	CA Paranaense	CA Mineiro	\N	\N	SCHEDULED	2026-10-07 00:00:00	\N	2026-04-24 17:54:22.545	2026-04-24 17:54:22.545	f	555020	f
37a81a03-b8d0-44bf-8dd7-5d207ad02df6	b0ab860a-8e72-415e-94f4-9882ab1e70bb	Botafogo FR	CR Vasco da Gama	\N	\N	SCHEDULED	2026-10-07 00:00:00	\N	2026-04-24 17:54:22.546	2026-04-24 17:54:22.546	f	555021	f
8ea9ca7c-6080-4757-a44c-3c65f71598f6	b0ab860a-8e72-415e-94f4-9882ab1e70bb	RB Bragantino	Mirassol FC	\N	\N	SCHEDULED	2026-10-07 00:00:00	\N	2026-04-24 17:54:22.547	2026-04-24 17:54:22.547	f	555022	f
dc1923ef-7077-47b6-b83c-b6e393dbe4f0	b0ab860a-8e72-415e-94f4-9882ab1e70bb	Cruzeiro EC	São Paulo FC	\N	\N	SCHEDULED	2026-10-07 00:00:00	\N	2026-04-24 17:54:22.548	2026-04-24 17:54:22.548	f	555023	f
6487c226-a69f-46db-94de-c667699a42f5	b0ab860a-8e72-415e-94f4-9882ab1e70bb	Fluminense FC	Coritiba FBC	\N	\N	SCHEDULED	2026-10-07 00:00:00	\N	2026-04-24 17:54:22.548	2026-04-24 17:54:22.548	f	555024	f
86d3d919-efaa-4dea-b545-52fd5b362645	b0ab860a-8e72-415e-94f4-9882ab1e70bb	SC Internacional	SC Corinthians Paulista	\N	\N	SCHEDULED	2026-10-07 00:00:00	\N	2026-04-24 17:54:22.55	2026-04-24 17:54:22.55	f	555025	f
d6881fbd-4711-41de-94e7-3756227df991	b0ab860a-8e72-415e-94f4-9882ab1e70bb	SE Palmeiras	EC Bahia	\N	\N	SCHEDULED	2026-10-07 00:00:00	\N	2026-04-24 17:54:22.551	2026-04-24 17:54:22.551	f	555026	f
a941740e-0b2d-4a73-8c1c-c4692712c143	b0ab860a-8e72-415e-94f4-9882ab1e70bb	Clube do Remo	Grêmio FBPA	\N	\N	SCHEDULED	2026-10-07 00:00:00	\N	2026-04-24 17:54:22.552	2026-04-24 17:54:22.552	f	555027	f
28ff4c83-b28c-42f8-99e0-b31612119d8c	b0ab860a-8e72-415e-94f4-9882ab1e70bb	Santos FC	CR Flamengo	\N	\N	SCHEDULED	2026-10-07 00:00:00	\N	2026-04-24 17:54:22.553	2026-04-24 17:54:22.553	f	555028	f
568a1502-0e6b-451f-9a06-542485b8c2eb	b0ab860a-8e72-415e-94f4-9882ab1e70bb	EC Vitória	Chapecoense AF	\N	\N	SCHEDULED	2026-10-07 00:00:00	\N	2026-04-24 17:54:22.555	2026-04-24 17:54:22.555	f	555029	f
f4e70aa4-b39e-4274-9548-db8ba1eef937	035dc378-fe63-45fc-a7a0-4aa894b0cca6	CA Mineiro	Santos FC	\N	\N	SCHEDULED	2026-10-10 00:00:00	\N	2026-04-24 17:54:22.556	2026-04-24 17:54:22.556	f	555030	f
9811e189-d857-422e-a782-7fbf9cffb43b	035dc378-fe63-45fc-a7a0-4aa894b0cca6	EC Bahia	Mirassol FC	\N	\N	SCHEDULED	2026-10-10 00:00:00	\N	2026-04-24 17:54:22.556	2026-04-24 17:54:22.556	f	555031	f
4bf521e0-8d38-43e7-98d2-86cbdb210fcb	035dc378-fe63-45fc-a7a0-4aa894b0cca6	RB Bragantino	Cruzeiro EC	\N	\N	SCHEDULED	2026-10-10 00:00:00	\N	2026-04-24 17:54:22.557	2026-04-24 17:54:22.557	f	555032	f
81d07535-ba87-4d7c-b257-2718ae4cd2ed	035dc378-fe63-45fc-a7a0-4aa894b0cca6	Chapecoense AF	CA Paranaense	\N	\N	SCHEDULED	2026-10-10 00:00:00	\N	2026-04-24 17:54:22.558	2026-04-24 17:54:22.558	f	555033	f
0c107969-a67e-4388-832f-a2881284115d	035dc378-fe63-45fc-a7a0-4aa894b0cca6	Coritiba FBC	Botafogo FR	\N	\N	SCHEDULED	2026-10-10 00:00:00	\N	2026-04-24 17:54:22.559	2026-04-24 17:54:22.559	f	555034	f
481bf820-d314-400d-9d98-71878408c3c1	035dc378-fe63-45fc-a7a0-4aa894b0cca6	CR Flamengo	Fluminense FC	\N	\N	SCHEDULED	2026-10-10 00:00:00	\N	2026-04-24 17:54:22.56	2026-04-24 17:54:22.56	f	555035	f
8dac526d-2115-4fd7-8e6f-bd6bd578c306	035dc378-fe63-45fc-a7a0-4aa894b0cca6	Grêmio FBPA	SC Internacional	\N	\N	SCHEDULED	2026-10-10 00:00:00	\N	2026-04-24 17:54:22.561	2026-04-24 17:54:22.561	f	555036	f
bea70282-bb8d-44fb-a4d2-d60708f19b26	035dc378-fe63-45fc-a7a0-4aa894b0cca6	SE Palmeiras	SC Corinthians Paulista	\N	\N	SCHEDULED	2026-10-10 00:00:00	\N	2026-04-24 17:54:22.561	2026-04-24 17:54:22.561	f	555037	f
fb58e5d2-d12c-4f60-9774-dbf068009c5b	035dc378-fe63-45fc-a7a0-4aa894b0cca6	São Paulo FC	EC Vitória	\N	\N	SCHEDULED	2026-10-10 00:00:00	\N	2026-04-24 17:54:22.562	2026-04-24 17:54:22.562	f	555038	f
081571cc-b261-48e4-be7d-df629e234543	035dc378-fe63-45fc-a7a0-4aa894b0cca6	CR Vasco da Gama	Clube do Remo	\N	\N	SCHEDULED	2026-10-10 00:00:00	\N	2026-04-24 17:54:22.563	2026-04-24 17:54:22.563	f	555039	f
90edf1de-acc5-4414-a8ce-8e2ed187e760	0d584f02-7d45-4bac-88fb-a43642932b23	CA Paranaense	SE Palmeiras	\N	\N	SCHEDULED	2026-10-17 00:00:00	\N	2026-04-24 17:54:22.565	2026-04-24 17:54:22.565	f	555040	f
452ce2fc-6be5-413e-96d4-7889d22da83c	0d584f02-7d45-4bac-88fb-a43642932b23	CA Mineiro	Coritiba FBC	\N	\N	SCHEDULED	2026-10-17 00:00:00	\N	2026-04-24 17:54:22.566	2026-04-24 17:54:22.566	f	555041	f
27b44854-d089-448b-b4bf-a9fc41181487	0d584f02-7d45-4bac-88fb-a43642932b23	EC Bahia	CR Flamengo	\N	\N	SCHEDULED	2026-10-17 00:00:00	\N	2026-04-24 17:54:22.566	2026-04-24 17:54:22.566	f	555042	f
b22c4aa2-5eeb-4165-af2b-13a6cc56c0d1	0d584f02-7d45-4bac-88fb-a43642932b23	Botafogo FR	Chapecoense AF	\N	\N	SCHEDULED	2026-10-17 00:00:00	\N	2026-04-24 17:54:22.567	2026-04-24 17:54:22.567	f	555043	f
d4c04264-8e15-4867-b19a-bca0ff9d2ab0	0d584f02-7d45-4bac-88fb-a43642932b23	SC Corinthians Paulista	EC Vitória	\N	\N	SCHEDULED	2026-10-17 00:00:00	\N	2026-04-24 17:54:22.568	2026-04-24 17:54:22.568	f	555044	f
d75747ed-7dde-4b48-872a-d72285de7e13	0d584f02-7d45-4bac-88fb-a43642932b23	Fluminense FC	Santos FC	\N	\N	SCHEDULED	2026-10-17 00:00:00	\N	2026-04-24 17:54:22.569	2026-04-24 17:54:22.569	f	555045	f
86491635-c8b6-43d3-bfcf-30b103cce932	0d584f02-7d45-4bac-88fb-a43642932b23	Grêmio FBPA	Cruzeiro EC	\N	\N	SCHEDULED	2026-10-17 00:00:00	\N	2026-04-24 17:54:22.57	2026-04-24 17:54:22.57	f	555046	f
476d3e87-6313-4cc3-96e3-399811d64b03	0d584f02-7d45-4bac-88fb-a43642932b23	Mirassol FC	SC Internacional	\N	\N	SCHEDULED	2026-10-17 00:00:00	\N	2026-04-24 17:54:22.571	2026-04-24 17:54:22.571	f	555047	f
9c56cd5c-9d8a-4a34-81f2-1f0c034935e6	0d584f02-7d45-4bac-88fb-a43642932b23	Clube do Remo	RB Bragantino	\N	\N	SCHEDULED	2026-10-17 00:00:00	\N	2026-04-24 17:54:22.572	2026-04-24 17:54:22.572	f	555048	f
5ae53f11-5313-4a02-80ae-f5973f317207	0d584f02-7d45-4bac-88fb-a43642932b23	São Paulo FC	CR Vasco da Gama	\N	\N	SCHEDULED	2026-10-17 00:00:00	\N	2026-04-24 17:54:22.573	2026-04-24 17:54:22.573	f	555049	f
f9723edd-8dbe-4dd2-a6ea-4dc8744fa1fe	9552d0a1-03b0-4fc7-b740-7bdc998d64d0	Chapecoense AF	Fluminense FC	\N	\N	SCHEDULED	2026-10-24 00:00:00	\N	2026-04-24 17:54:22.574	2026-04-24 17:54:22.574	f	555050	f
a112d7d1-286e-4c9d-8b25-c62ad29835c6	9552d0a1-03b0-4fc7-b740-7bdc998d64d0	Coritiba FBC	Grêmio FBPA	\N	\N	SCHEDULED	2026-10-24 00:00:00	\N	2026-04-24 17:54:22.574	2026-04-24 17:54:22.574	f	555051	f
831e111c-30d4-4169-8b5c-bc65dd31098d	9552d0a1-03b0-4fc7-b740-7bdc998d64d0	Cruzeiro EC	Clube do Remo	\N	\N	SCHEDULED	2026-10-24 00:00:00	\N	2026-04-24 17:54:22.575	2026-04-24 17:54:22.575	f	555052	f
32dc2f88-0ec6-4966-8e14-13bc391ffb46	9552d0a1-03b0-4fc7-b740-7bdc998d64d0	CR Flamengo	CA Mineiro	\N	\N	SCHEDULED	2026-10-24 00:00:00	\N	2026-04-24 17:54:22.576	2026-04-24 17:54:22.576	f	555053	f
cb66c9a8-3a21-46bc-a4a8-6002fe3b1ae6	9552d0a1-03b0-4fc7-b740-7bdc998d64d0	SC Internacional	Botafogo FR	\N	\N	SCHEDULED	2026-10-24 00:00:00	\N	2026-04-24 17:54:22.577	2026-04-24 17:54:22.577	f	555054	f
2bcddf50-5ec1-4731-8489-ce4fa789af61	9552d0a1-03b0-4fc7-b740-7bdc998d64d0	Mirassol FC	São Paulo FC	\N	\N	SCHEDULED	2026-10-24 00:00:00	\N	2026-04-24 17:54:22.577	2026-04-24 17:54:22.577	f	555055	f
482471a7-8cea-4419-9f11-2de7a30fca1f	9552d0a1-03b0-4fc7-b740-7bdc998d64d0	SE Palmeiras	RB Bragantino	\N	\N	SCHEDULED	2026-10-24 00:00:00	\N	2026-04-24 17:54:22.578	2026-04-24 17:54:22.578	f	555056	f
2e9c32ef-2463-4668-b6a5-cad957a840ad	9552d0a1-03b0-4fc7-b740-7bdc998d64d0	Santos FC	EC Bahia	\N	\N	SCHEDULED	2026-10-24 00:00:00	\N	2026-04-24 17:54:22.579	2026-04-24 17:54:22.579	f	555057	f
2784b5b4-d4d1-4cda-b8ac-d7cbde43d7a9	9552d0a1-03b0-4fc7-b740-7bdc998d64d0	CR Vasco da Gama	SC Corinthians Paulista	\N	\N	SCHEDULED	2026-10-24 00:00:00	\N	2026-04-24 17:54:22.579	2026-04-24 17:54:22.579	f	555058	f
dc4c4e85-d61e-4d4d-beab-91ca3ad27de6	9552d0a1-03b0-4fc7-b740-7bdc998d64d0	EC Vitória	CA Paranaense	\N	\N	SCHEDULED	2026-10-24 00:00:00	\N	2026-04-24 17:54:22.58	2026-04-24 17:54:22.58	f	555059	f
82991b80-a10f-41d7-bfe9-e5c51f939e1b	9ec3641c-d797-4cea-be7c-5cea958eca1a	CA Mineiro	Cruzeiro EC	\N	\N	SCHEDULED	2026-10-28 00:00:00	\N	2026-04-24 17:54:22.581	2026-04-24 17:54:22.581	f	555060	f
f2b1b165-9441-4392-8563-a75e969c40fe	9ec3641c-d797-4cea-be7c-5cea958eca1a	EC Bahia	São Paulo FC	\N	\N	SCHEDULED	2026-10-28 00:00:00	\N	2026-04-24 17:54:22.582	2026-04-24 17:54:22.582	f	555061	f
16b8c6b2-d993-41fa-a6ce-746c72a4bd76	9ec3641c-d797-4cea-be7c-5cea958eca1a	RB Bragantino	Chapecoense AF	\N	\N	SCHEDULED	2026-10-28 00:00:00	\N	2026-04-24 17:54:22.582	2026-04-24 17:54:22.582	f	555062	f
cb2f556d-dddc-4fe8-a2e9-0f3dd946c589	9ec3641c-d797-4cea-be7c-5cea958eca1a	SC Corinthians Paulista	Mirassol FC	\N	\N	SCHEDULED	2026-10-28 00:00:00	\N	2026-04-24 17:54:22.583	2026-04-24 17:54:22.583	f	555063	f
56a40153-1a4d-41d7-95a3-9d3f07b771da	9ec3641c-d797-4cea-be7c-5cea958eca1a	Coritiba FBC	EC Vitória	\N	\N	SCHEDULED	2026-10-28 00:00:00	\N	2026-04-24 17:54:22.584	2026-04-24 17:54:22.584	f	555064	f
25d48ea4-aec0-4d55-8022-78c5158e8e00	9ec3641c-d797-4cea-be7c-5cea958eca1a	Fluminense FC	SC Internacional	\N	\N	SCHEDULED	2026-10-28 00:00:00	\N	2026-04-24 17:54:22.585	2026-04-24 17:54:22.585	f	555065	f
3d1997fd-f1d4-414c-b8c8-d01f42d2383a	9ec3641c-d797-4cea-be7c-5cea958eca1a	Grêmio FBPA	CA Paranaense	\N	\N	SCHEDULED	2026-10-28 00:00:00	\N	2026-04-24 17:54:22.585	2026-04-24 17:54:22.585	f	555066	f
175c76e9-4b41-4a8b-98c2-ca2025149023	9ec3641c-d797-4cea-be7c-5cea958eca1a	Clube do Remo	Botafogo FR	\N	\N	SCHEDULED	2026-10-28 00:00:00	\N	2026-04-24 17:54:22.587	2026-04-24 17:54:22.587	f	555067	f
0ed1fc3c-7f8a-4fb2-81de-72bf721ec915	9ec3641c-d797-4cea-be7c-5cea958eca1a	Santos FC	SE Palmeiras	\N	\N	SCHEDULED	2026-10-28 00:00:00	\N	2026-04-24 17:54:22.588	2026-04-24 17:54:22.588	f	555068	f
eeb121d6-7ee3-4b4c-a088-15ebb6c3856b	9ec3641c-d797-4cea-be7c-5cea958eca1a	CR Vasco da Gama	CR Flamengo	\N	\N	SCHEDULED	2026-10-28 00:00:00	\N	2026-04-24 17:54:22.589	2026-04-24 17:54:22.589	f	555069	f
26c039ca-3d3a-452a-9277-6a45bb6bf5fb	1c23339e-cc1b-4bc2-8af7-ec136da2b36a	CA Paranaense	CR Vasco da Gama	\N	\N	SCHEDULED	2026-11-04 00:00:00	\N	2026-04-24 17:54:22.589	2026-04-24 17:54:22.589	f	555070	f
15727c40-b072-42cc-a75e-0dd9dd300dba	1c23339e-cc1b-4bc2-8af7-ec136da2b36a	Botafogo FR	CA Mineiro	\N	\N	SCHEDULED	2026-11-04 00:00:00	\N	2026-04-24 17:54:22.59	2026-04-24 17:54:22.59	f	555071	f
a331088a-4443-4c24-afcf-d06cd5b2842f	1c23339e-cc1b-4bc2-8af7-ec136da2b36a	RB Bragantino	Santos FC	\N	\N	SCHEDULED	2026-11-04 00:00:00	\N	2026-04-24 17:54:22.591	2026-04-24 17:54:22.591	f	555072	f
7d9fdf25-4784-411d-bafe-ec85baaa7a18	1c23339e-cc1b-4bc2-8af7-ec136da2b36a	Chapecoense AF	Mirassol FC	\N	\N	SCHEDULED	2026-11-04 00:00:00	\N	2026-04-24 17:54:22.592	2026-04-24 17:54:22.592	f	555073	f
86c64253-efd4-4dfd-b944-3e5853c60402	1c23339e-cc1b-4bc2-8af7-ec136da2b36a	Cruzeiro EC	EC Bahia	\N	\N	SCHEDULED	2026-11-04 00:00:00	\N	2026-04-24 17:54:22.593	2026-04-24 17:54:22.593	f	555074	f
5eff6b87-fedc-488b-86b6-9347d12537f9	1c23339e-cc1b-4bc2-8af7-ec136da2b36a	CR Flamengo	Grêmio FBPA	\N	\N	SCHEDULED	2026-11-04 00:00:00	\N	2026-04-24 17:54:22.594	2026-04-24 17:54:22.594	f	555075	f
743828f1-af2d-4782-b6c6-2f0d128e163c	1c23339e-cc1b-4bc2-8af7-ec136da2b36a	SC Internacional	Coritiba FBC	\N	\N	SCHEDULED	2026-11-04 00:00:00	\N	2026-04-24 17:54:22.594	2026-04-24 17:54:22.594	f	555076	f
b7575156-c0c5-4364-81ef-cfa60e1c773a	1c23339e-cc1b-4bc2-8af7-ec136da2b36a	SE Palmeiras	Clube do Remo	\N	\N	SCHEDULED	2026-11-04 00:00:00	\N	2026-04-24 17:54:22.595	2026-04-24 17:54:22.595	f	555077	f
6c2b5ab4-7a21-4c9f-93b9-0cc1b08099d9	1c23339e-cc1b-4bc2-8af7-ec136da2b36a	São Paulo FC	SC Corinthians Paulista	\N	\N	SCHEDULED	2026-11-04 00:00:00	\N	2026-04-24 17:54:22.596	2026-04-24 17:54:22.596	f	555078	f
7a8a5a9b-37bb-4742-a0ed-ddfaf15ab27c	1c23339e-cc1b-4bc2-8af7-ec136da2b36a	EC Vitória	Fluminense FC	\N	\N	SCHEDULED	2026-11-04 00:00:00	\N	2026-04-24 17:54:22.596	2026-04-24 17:54:22.596	f	555079	f
2130d96f-e011-49c9-ae88-fac5a68f713b	4e71bbe3-a714-4043-99ec-7ba94735827b	SC Corinthians Paulista	Botafogo FR	\N	\N	SCHEDULED	2026-11-18 00:00:00	\N	2026-04-24 17:54:22.597	2026-04-24 17:54:22.597	f	555080	f
598c0362-f008-434b-824b-a69fedb25b36	4e71bbe3-a714-4043-99ec-7ba94735827b	Coritiba FBC	Santos FC	\N	\N	SCHEDULED	2026-11-18 00:00:00	\N	2026-04-24 17:54:22.598	2026-04-24 17:54:22.598	f	555081	f
be0c1333-bb48-482c-932e-910a20f26fbe	4e71bbe3-a714-4043-99ec-7ba94735827b	Cruzeiro EC	SE Palmeiras	\N	\N	SCHEDULED	2026-11-18 00:00:00	\N	2026-04-24 17:54:22.599	2026-04-24 17:54:22.599	f	555082	f
86a824ec-cc9a-4f11-bb73-5256d888398f	4e71bbe3-a714-4043-99ec-7ba94735827b	CR Flamengo	CA Paranaense	\N	\N	SCHEDULED	2026-11-18 00:00:00	\N	2026-04-24 17:54:22.599	2026-04-24 17:54:22.599	f	555083	f
d562e077-4de7-4b1c-8d05-0cf273d500e5	4e71bbe3-a714-4043-99ec-7ba94735827b	Grêmio FBPA	EC Bahia	\N	\N	SCHEDULED	2026-11-18 00:00:00	\N	2026-04-24 17:54:22.6	2026-04-24 17:54:22.6	f	555084	f
0f557a2a-14b9-4e22-b5ba-4eada257db67	4e71bbe3-a714-4043-99ec-7ba94735827b	Mirassol FC	CA Mineiro	\N	\N	SCHEDULED	2026-11-18 00:00:00	\N	2026-04-24 17:54:22.601	2026-04-24 17:54:22.601	f	555085	f
5ac10747-834b-419e-a4ff-c9d084511c46	4e71bbe3-a714-4043-99ec-7ba94735827b	Clube do Remo	Chapecoense AF	\N	\N	SCHEDULED	2026-11-18 00:00:00	\N	2026-04-24 17:54:22.601	2026-04-24 17:54:22.601	f	555086	f
76c4f2a9-d846-40b6-a67b-2d989e568618	4e71bbe3-a714-4043-99ec-7ba94735827b	São Paulo FC	Fluminense FC	\N	\N	SCHEDULED	2026-11-18 00:00:00	\N	2026-04-24 17:54:22.602	2026-04-24 17:54:22.602	f	555087	f
57eef08a-1424-47e9-b29d-e4aaa524063f	4e71bbe3-a714-4043-99ec-7ba94735827b	CR Vasco da Gama	SC Internacional	\N	\N	SCHEDULED	2026-11-18 00:00:00	\N	2026-04-24 17:54:22.603	2026-04-24 17:54:22.603	f	555088	f
f46a9f60-7cf9-4a06-908e-08885677a5a1	4e71bbe3-a714-4043-99ec-7ba94735827b	EC Vitória	RB Bragantino	\N	\N	SCHEDULED	2026-11-18 00:00:00	\N	2026-04-24 17:54:22.604	2026-04-24 17:54:22.604	f	555089	f
184c85f7-45f2-4345-b871-69ad67e7250b	426997dc-f5e5-40b0-a564-f69f6fe4994a	CA Paranaense	Clube do Remo	\N	\N	SCHEDULED	2026-11-21 00:00:00	\N	2026-04-24 17:54:22.605	2026-04-24 17:54:22.605	f	555090	f
557b4819-d0b3-4c36-be5a-b54891f0ad0f	426997dc-f5e5-40b0-a564-f69f6fe4994a	CA Mineiro	SC Corinthians Paulista	\N	\N	SCHEDULED	2026-11-21 00:00:00	\N	2026-04-24 17:54:22.606	2026-04-24 17:54:22.606	f	555091	f
00c82360-9c21-4ef7-9c23-ecb54406a5f9	426997dc-f5e5-40b0-a564-f69f6fe4994a	EC Bahia	Coritiba FBC	\N	\N	SCHEDULED	2026-11-21 00:00:00	\N	2026-04-24 17:54:22.606	2026-04-24 17:54:22.606	f	555092	f
9b1f1890-30b9-4e78-b7ec-fc277d455fb4	426997dc-f5e5-40b0-a564-f69f6fe4994a	Botafogo FR	São Paulo FC	\N	\N	SCHEDULED	2026-11-21 00:00:00	\N	2026-04-24 17:54:22.607	2026-04-24 17:54:22.607	f	555093	f
fbe53a31-7b05-4bbc-a7c3-ac8fa7a9f788	426997dc-f5e5-40b0-a564-f69f6fe4994a	RB Bragantino	CR Vasco da Gama	\N	\N	SCHEDULED	2026-11-21 00:00:00	\N	2026-04-24 17:54:22.608	2026-04-24 17:54:22.608	f	555094	f
0796426e-4219-428e-9974-27481c029762	426997dc-f5e5-40b0-a564-f69f6fe4994a	Chapecoense AF	Cruzeiro EC	\N	\N	SCHEDULED	2026-11-21 00:00:00	\N	2026-04-24 17:54:22.608	2026-04-24 17:54:22.608	f	555095	f
292e64c0-d7cc-4d76-a82d-a51b7362dc84	426997dc-f5e5-40b0-a564-f69f6fe4994a	Fluminense FC	Mirassol FC	\N	\N	SCHEDULED	2026-11-21 00:00:00	\N	2026-04-24 17:54:22.609	2026-04-24 17:54:22.609	f	555096	f
bbeccc11-2381-46b3-9f3b-cdbea16eee06	426997dc-f5e5-40b0-a564-f69f6fe4994a	SC Internacional	EC Vitória	\N	\N	SCHEDULED	2026-11-21 00:00:00	\N	2026-04-24 17:54:22.61	2026-04-24 17:54:22.61	f	555097	f
00b1e200-72e7-4b29-8835-93c8f4e51c53	426997dc-f5e5-40b0-a564-f69f6fe4994a	SE Palmeiras	CR Flamengo	\N	\N	SCHEDULED	2026-11-21 00:00:00	\N	2026-04-24 17:54:22.61	2026-04-24 17:54:22.61	f	555098	f
3a614119-c2f4-4afb-ae2c-f84a684545cd	426997dc-f5e5-40b0-a564-f69f6fe4994a	Santos FC	Grêmio FBPA	\N	\N	SCHEDULED	2026-11-21 00:00:00	\N	2026-04-24 17:54:22.611	2026-04-24 17:54:22.611	f	555099	f
ba1c1036-c835-4ff2-a5fc-bc2f44059c86	7717d776-e9c0-4c14-9c7f-5e16e9c82eba	CA Mineiro	CR Vasco da Gama	\N	\N	SCHEDULED	2026-11-28 00:00:00	\N	2026-04-24 17:54:22.612	2026-04-24 17:54:22.612	f	555100	f
b6166235-94fd-44bd-a657-8dc6b31bd9af	7717d776-e9c0-4c14-9c7f-5e16e9c82eba	Botafogo FR	EC Bahia	\N	\N	SCHEDULED	2026-11-28 00:00:00	\N	2026-04-24 17:54:22.613	2026-04-24 17:54:22.613	f	555101	f
4d1dd829-85b5-4dba-8a24-12fd66759072	7717d776-e9c0-4c14-9c7f-5e16e9c82eba	Chapecoense AF	SE Palmeiras	\N	\N	SCHEDULED	2026-11-28 00:00:00	\N	2026-04-24 17:54:22.613	2026-04-24 17:54:22.613	f	555102	f
51c1d959-ca1b-4766-b45e-32b5bfbe4bad	7717d776-e9c0-4c14-9c7f-5e16e9c82eba	SC Corinthians Paulista	Grêmio FBPA	\N	\N	SCHEDULED	2026-11-28 00:00:00	\N	2026-04-24 17:54:22.614	2026-04-24 17:54:22.614	f	555103	f
324377da-a485-4e33-bd30-d587f426dfc7	7717d776-e9c0-4c14-9c7f-5e16e9c82eba	Coritiba FBC	CR Flamengo	\N	\N	SCHEDULED	2026-11-28 00:00:00	\N	2026-04-24 17:54:22.615	2026-04-24 17:54:22.615	f	555104	f
f9867949-5568-4d97-9d5b-307f06f84fe3	7717d776-e9c0-4c14-9c7f-5e16e9c82eba	Fluminense FC	Cruzeiro EC	\N	\N	SCHEDULED	2026-11-28 00:00:00	\N	2026-04-24 17:54:22.615	2026-04-24 17:54:22.615	f	555105	f
b6f8ded6-d7fd-437a-bcb6-1716ba644702	7717d776-e9c0-4c14-9c7f-5e16e9c82eba	SC Internacional	RB Bragantino	\N	\N	SCHEDULED	2026-11-28 00:00:00	\N	2026-04-24 17:54:22.616	2026-04-24 17:54:22.616	f	555106	f
c19fa155-64d8-4cdc-b406-965f4439c52f	7717d776-e9c0-4c14-9c7f-5e16e9c82eba	Mirassol FC	CA Paranaense	\N	\N	SCHEDULED	2026-11-28 00:00:00	\N	2026-04-24 17:54:22.617	2026-04-24 17:54:22.617	f	555107	f
101d1d63-2239-4703-8572-348a2abdb738	7717d776-e9c0-4c14-9c7f-5e16e9c82eba	São Paulo FC	Clube do Remo	\N	\N	SCHEDULED	2026-11-28 00:00:00	\N	2026-04-24 17:54:22.618	2026-04-24 17:54:22.618	f	555108	f
9a1b1bd4-d5c2-4165-8339-8663e330837b	7717d776-e9c0-4c14-9c7f-5e16e9c82eba	EC Vitória	Santos FC	\N	\N	SCHEDULED	2026-11-28 00:00:00	\N	2026-04-24 17:54:22.618	2026-04-24 17:54:22.618	f	555109	f
66624550-9a74-479f-9f77-18e2086a8c05	cdb1be1e-68de-460b-9443-8d06b6c8ecff	CA Paranaense	São Paulo FC	\N	\N	SCHEDULED	2026-12-02 00:00:00	\N	2026-04-24 17:54:22.619	2026-04-24 17:54:22.619	f	555110	f
089042a9-12af-43be-afba-e1efb179d290	cdb1be1e-68de-460b-9443-8d06b6c8ecff	EC Bahia	CA Mineiro	\N	\N	SCHEDULED	2026-12-02 00:00:00	\N	2026-04-24 17:54:22.62	2026-04-24 17:54:22.62	f	555111	f
3a6da383-e38e-4285-8d99-92322f02a2bb	cdb1be1e-68de-460b-9443-8d06b6c8ecff	RB Bragantino	Fluminense FC	\N	\N	SCHEDULED	2026-12-02 00:00:00	\N	2026-04-24 17:54:22.622	2026-04-24 17:54:22.622	f	555112	f
2f76fd8c-1e31-4a07-906b-309d913fad43	cdb1be1e-68de-460b-9443-8d06b6c8ecff	Cruzeiro EC	SC Internacional	\N	\N	SCHEDULED	2026-12-02 00:00:00	\N	2026-04-24 17:54:22.623	2026-04-24 17:54:22.623	f	555113	f
973fba40-61c9-4329-a511-f83f150e0840	cdb1be1e-68de-460b-9443-8d06b6c8ecff	CR Flamengo	Chapecoense AF	\N	\N	SCHEDULED	2026-12-02 00:00:00	\N	2026-04-24 17:54:22.624	2026-04-24 17:54:22.624	f	555114	f
f6efb551-bb53-4b98-bc75-af1c3584c63b	cdb1be1e-68de-460b-9443-8d06b6c8ecff	Grêmio FBPA	Mirassol FC	\N	\N	SCHEDULED	2026-12-02 00:00:00	\N	2026-04-24 17:54:22.624	2026-04-24 17:54:22.624	f	555115	f
20492a0a-9ce7-456a-ad9f-20741313f07f	cdb1be1e-68de-460b-9443-8d06b6c8ecff	SE Palmeiras	Coritiba FBC	\N	\N	SCHEDULED	2026-12-02 00:00:00	\N	2026-04-24 17:54:22.625	2026-04-24 17:54:22.625	f	555116	f
9b547ddd-76d8-450f-ab8d-c71034c19f47	cdb1be1e-68de-460b-9443-8d06b6c8ecff	Clube do Remo	SC Corinthians Paulista	\N	\N	SCHEDULED	2026-12-02 00:00:00	\N	2026-04-24 17:54:22.626	2026-04-24 17:54:22.626	f	555117	f
f40234ea-3ca9-4171-9f8c-58de2b40c2c6	cdb1be1e-68de-460b-9443-8d06b6c8ecff	Santos FC	Botafogo FR	\N	\N	SCHEDULED	2026-12-02 00:00:00	\N	2026-04-24 17:54:22.626	2026-04-24 17:54:22.626	f	555118	f
997afb07-95d7-4736-a134-753e0d88d440	cdb1be1e-68de-460b-9443-8d06b6c8ecff	CR Vasco da Gama	EC Vitória	\N	\N	SCHEDULED	2026-12-02 00:00:00	\N	2026-04-24 17:54:22.627	2026-04-24 17:54:22.627	f	555119	f
49e96fa3-9c08-4c2b-afbf-821ff46ea990	15389403-6a94-4547-a905-c19043a11e59	CA Mineiro	SE Palmeiras	2	2	FINISHED	2026-01-28 22:00:00	\N	2026-04-26 00:49:25.708	2026-04-26 00:49:25.708	f	554740	f
e7100869-48b2-4ef9-a0f3-49c454c0712b	15389403-6a94-4547-a905-c19043a11e59	Coritiba FBC	RB Bragantino	0	1	FINISHED	2026-01-28 22:00:00	\N	2026-04-26 00:49:25.721	2026-04-26 00:49:25.721	f	554744	f
5a59b0e7-704b-4da2-8c83-29e17f3d0f97	15389403-6a94-4547-a905-c19043a11e59	SC Internacional	CA Paranaense	0	1	FINISHED	2026-01-28 22:00:00	\N	2026-04-26 00:49:25.724	2026-04-26 00:49:25.724	f	554746	f
9f546272-00d3-4ef5-8553-5ed84683de24	15389403-6a94-4547-a905-c19043a11e59	EC Vitória	Clube do Remo	2	0	FINISHED	2026-01-28 22:00:00	\N	2026-04-26 00:49:25.726	2026-04-26 00:49:25.726	f	554749	f
6ea38bc4-6fab-4337-bc33-2fadc32e8f5e	15389403-6a94-4547-a905-c19043a11e59	Fluminense FC	Grêmio FBPA	2	1	FINISHED	2026-01-28 22:30:00	\N	2026-04-26 00:49:25.729	2026-04-26 00:49:25.729	f	554745	f
a3792642-5357-4a6b-8f84-434677aa23af	15389403-6a94-4547-a905-c19043a11e59	Chapecoense AF	Santos FC	4	2	FINISHED	2026-01-28 23:00:00	\N	2026-04-26 00:49:25.731	2026-04-26 00:49:25.731	f	554742	f
84843308-35be-4d79-9e61-1249bad3a8fa	15389403-6a94-4547-a905-c19043a11e59	SC Corinthians Paulista	EC Bahia	1	2	FINISHED	2026-01-28 23:00:00	\N	2026-04-26 00:49:25.737	2026-04-26 00:49:25.737	f	554743	f
2ea1e7f0-5cfd-4cff-a98b-3b008df58ba4	15389403-6a94-4547-a905-c19043a11e59	São Paulo FC	CR Flamengo	2	1	FINISHED	2026-01-29 00:30:00	\N	2026-04-26 00:49:25.739	2026-04-26 00:49:25.739	f	554748	f
81fbc40e-4683-48e9-a44d-9e78cab27a67	15389403-6a94-4547-a905-c19043a11e59	Mirassol FC	CR Vasco da Gama	2	1	FINISHED	2026-01-29 23:00:00	\N	2026-04-26 00:49:25.74	2026-04-26 00:49:25.74	f	554747	f
022f2c5e-9cfd-4683-99ab-2a44387ed01a	15389403-6a94-4547-a905-c19043a11e59	Botafogo FR	Cruzeiro EC	4	0	FINISHED	2026-01-30 00:30:00	\N	2026-04-26 00:49:25.742	2026-04-26 00:49:25.742	f	554741	f
b8a220c0-53ab-4d67-bcf2-5f387f940b44	61cf05c8-99ca-4651-904e-00a796611ca9	RB Bragantino	CA Mineiro	1	0	FINISHED	2026-02-04 22:00:00	\N	2026-04-26 00:49:25.745	2026-04-26 00:49:25.745	f	554752	f
ebbbf773-5f1a-45ec-aba7-d4e952d285b8	61cf05c8-99ca-4651-904e-00a796611ca9	CR Flamengo	SC Internacional	1	1	FINISHED	2026-02-04 22:00:00	\N	2026-04-26 00:49:25.747	2026-04-26 00:49:25.747	f	554754	f
84d1b78c-d9dd-4758-8a66-d634ae0dc2ce	61cf05c8-99ca-4651-904e-00a796611ca9	Clube do Remo	Mirassol FC	2	2	FINISHED	2026-02-04 23:00:00	\N	2026-04-26 00:49:25.751	2026-04-26 00:49:25.751	f	554757	f
30f676c1-94c3-4b7f-b3eb-614536b79bd5	61cf05c8-99ca-4651-904e-00a796611ca9	Santos FC	São Paulo FC	1	1	FINISHED	2026-02-04 23:00:00	\N	2026-04-26 00:49:25.753	2026-04-26 00:49:25.753	f	554758	f
de258c7a-6381-4b90-a2a9-1e2f3d0dda11	61cf05c8-99ca-4651-904e-00a796611ca9	Grêmio FBPA	Botafogo FR	5	3	FINISHED	2026-02-05 00:30:00	\N	2026-04-26 00:49:25.755	2026-04-26 00:49:25.755	f	554755	f
59cfce35-2667-46f7-ae34-62d322b5b56c	61cf05c8-99ca-4651-904e-00a796611ca9	SE Palmeiras	EC Vitória	5	1	FINISHED	2026-02-05 00:30:00	\N	2026-04-26 00:49:25.757	2026-04-26 00:49:25.757	f	554756	f
f92ac842-f786-45ff-b722-5d0f7ffea1bc	61cf05c8-99ca-4651-904e-00a796611ca9	EC Bahia	Fluminense FC	1	1	FINISHED	2026-02-05 22:00:00	\N	2026-04-26 00:49:25.759	2026-04-26 00:49:25.759	f	554751	f
1ccf43ed-6d57-4e85-8767-8272774a4473	61cf05c8-99ca-4651-904e-00a796611ca9	CR Vasco da Gama	Chapecoense AF	1	1	FINISHED	2026-02-05 23:00:00	\N	2026-04-26 00:49:25.761	2026-04-26 00:49:25.761	f	554759	f
560c1c09-f8f2-4b44-a262-138a35e922bc	61cf05c8-99ca-4651-904e-00a796611ca9	Cruzeiro EC	Coritiba FBC	1	2	FINISHED	2026-02-06 00:30:00	\N	2026-04-26 00:49:25.763	2026-04-26 00:49:25.763	f	554753	f
87252fc5-cfee-49cc-8df4-d9d93237ddb7	68a49b1e-e524-4497-b144-6983751e8faf	EC Vitória	CR Flamengo	1	2	FINISHED	2026-02-11 00:30:00	\N	2026-04-26 00:49:25.765	2026-04-26 00:49:25.765	f	554769	f
be719949-4710-4ce6-b092-6228e8b8d9b3	68a49b1e-e524-4497-b144-6983751e8faf	Chapecoense AF	Coritiba FBC	3	3	FINISHED	2026-02-11 22:00:00	\N	2026-04-26 00:49:25.766	2026-04-26 00:49:25.766	f	554762	f
a2637e20-9e2d-422a-8da6-c0a14696587b	68a49b1e-e524-4497-b144-6983751e8faf	Mirassol FC	Cruzeiro EC	2	2	FINISHED	2026-02-11 22:00:00	\N	2026-04-26 00:49:25.768	2026-04-26 00:49:25.768	f	554766	f
e213c273-9c40-4423-9744-29c62159531f	68a49b1e-e524-4497-b144-6983751e8faf	CA Mineiro	Clube do Remo	3	3	FINISHED	2026-02-11 23:00:00	\N	2026-04-26 00:49:25.771	2026-04-26 00:49:25.771	f	554761	f
c88fea8f-e707-40fe-b6cb-254abb5042a6	68a49b1e-e524-4497-b144-6983751e8faf	São Paulo FC	Grêmio FBPA	2	0	FINISHED	2026-02-12 00:30:00	\N	2026-04-26 00:49:25.773	2026-04-26 00:49:25.773	f	554767	f
a86f6561-2760-4941-9bd2-75d2ebfa8d63	68a49b1e-e524-4497-b144-6983751e8faf	CR Vasco da Gama	EC Bahia	0	1	FINISHED	2026-02-12 00:30:00	\N	2026-04-26 00:49:25.775	2026-04-26 00:49:25.775	f	554768	f
0c0ac84d-1029-4bf7-b8b7-7a8b54e9ff8c	68a49b1e-e524-4497-b144-6983751e8faf	CA Paranaense	Santos FC	2	1	FINISHED	2026-02-12 22:00:00	\N	2026-04-26 00:49:25.777	2026-04-26 00:49:25.777	f	554760	f
ee0f1dac-c1a7-4e23-9678-7853bc9ff5ae	68a49b1e-e524-4497-b144-6983751e8faf	Fluminense FC	Botafogo FR	1	0	FINISHED	2026-02-12 22:30:00	\N	2026-04-26 00:49:25.779	2026-04-26 00:49:25.779	f	554764	f
1b693c7e-dcc5-4871-981d-b2546cde569b	68a49b1e-e524-4497-b144-6983751e8faf	SC Corinthians Paulista	RB Bragantino	2	0	FINISHED	2026-02-12 23:00:00	\N	2026-04-26 00:49:25.781	2026-04-26 00:49:25.781	f	554763	f
153fae21-4f47-4a43-9c41-7e2077085653	68a49b1e-e524-4497-b144-6983751e8faf	SC Internacional	SE Palmeiras	1	3	FINISHED	2026-02-13 00:30:00	\N	2026-04-26 00:49:25.782	2026-04-26 00:49:25.782	f	554765	f
aea793bd-a2ac-4726-9ce6-4b1f8752fb2b	61cf05c8-99ca-4651-904e-00a796611ca9	CA Paranaense	SC Corinthians Paulista	0	1	FINISHED	2026-02-19 22:30:00	\N	2026-04-26 00:49:25.784	2026-04-26 00:49:25.784	f	554750	f
12f86702-d704-47ae-9a88-4e4a6038f01d	ddeaf21a-fb74-4a98-8474-efa20301a66d	RB Bragantino	CA Paranaense	1	1	FINISHED	2026-02-25 22:00:00	\N	2026-04-26 00:49:25.787	2026-04-26 00:49:25.787	f	554772	f
e0852d99-9fe8-4ebf-8576-1d907b862a1d	ddeaf21a-fb74-4a98-8474-efa20301a66d	Clube do Remo	SC Internacional	1	1	FINISHED	2026-02-25 22:00:00	\N	2026-04-26 00:49:25.789	2026-04-26 00:49:25.789	f	554778	f
b9efedf7-fd19-420c-95cb-76da705ac84b	ddeaf21a-fb74-4a98-8474-efa20301a66d	Coritiba FBC	São Paulo FC	0	1	FINISHED	2026-02-25 22:30:00	\N	2026-04-26 00:49:25.791	2026-04-26 00:49:25.791	f	554773	f
0678bcef-b19e-473d-8a29-dd9fc0a5f498	ddeaf21a-fb74-4a98-8474-efa20301a66d	Cruzeiro EC	SC Corinthians Paulista	1	1	FINISHED	2026-02-25 23:00:00	\N	2026-04-26 00:49:25.793	2026-04-26 00:49:25.793	f	554774	f
5b52bdb4-586d-421c-96a1-9d2e369ab32b	ddeaf21a-fb74-4a98-8474-efa20301a66d	Grêmio FBPA	CA Mineiro	2	1	FINISHED	2026-02-26 00:30:00	\N	2026-04-26 00:49:25.795	2026-04-26 00:49:25.795	f	554776	f
08aa9b49-85cd-418c-ad44-3207e033da5d	ddeaf21a-fb74-4a98-8474-efa20301a66d	SE Palmeiras	Fluminense FC	2	1	FINISHED	2026-02-26 00:30:00	\N	2026-04-26 00:49:25.797	2026-04-26 00:49:25.797	f	554777	f
54f0cdae-3268-4265-93c6-d7b4c148f023	ddeaf21a-fb74-4a98-8474-efa20301a66d	Santos FC	CR Vasco da Gama	2	1	FINISHED	2026-02-26 22:00:00	\N	2026-04-26 00:49:25.798	2026-04-26 00:49:25.798	f	554779	f
0e45a5ba-ba04-4646-a255-5794c1c86595	911f62b6-5eb8-4528-8c5a-dce66b43985c	Mirassol FC	Santos FC	2	2	FINISHED	2026-03-11 00:30:00	\N	2026-04-26 00:49:25.802	2026-04-26 00:49:25.802	f	554786	f
c511da58-5ec6-4c21-9164-5c6193d6c9ce	911f62b6-5eb8-4528-8c5a-dce66b43985c	CA Mineiro	SC Internacional	1	0	FINISHED	2026-03-11 22:00:00	\N	2026-04-26 00:49:25.804	2026-04-26 00:49:25.804	f	554781	f
be08abf8-3f5c-49bf-a693-d1b1f3d9470a	911f62b6-5eb8-4528-8c5a-dce66b43985c	EC Bahia	EC Vitória	1	1	FINISHED	2026-03-11 23:00:00	\N	2026-04-26 00:49:25.806	2026-04-26 00:49:25.806	f	554782	f
65fc5064-4cc0-4654-97d2-6f558618ed8e	911f62b6-5eb8-4528-8c5a-dce66b43985c	SC Corinthians Paulista	Coritiba FBC	0	2	FINISHED	2026-03-12 00:30:00	\N	2026-04-26 00:49:25.808	2026-04-26 00:49:25.808	f	554783	f
22872506-ee2e-4f19-9c65-ade1cb112b1f	911f62b6-5eb8-4528-8c5a-dce66b43985c	CR Flamengo	Cruzeiro EC	2	0	FINISHED	2026-03-12 00:30:00	\N	2026-04-26 00:49:25.81	2026-04-26 00:49:25.81	f	554784	f
33ebfc6b-f4bd-470b-a6fc-105c3a7c383d	911f62b6-5eb8-4528-8c5a-dce66b43985c	Clube do Remo	Fluminense FC	0	2	FINISHED	2026-03-12 22:00:00	\N	2026-04-26 00:49:25.812	2026-04-26 00:49:25.812	f	554787	f
1d83f715-08b3-4713-a962-e411f7b5da98	911f62b6-5eb8-4528-8c5a-dce66b43985c	CR Vasco da Gama	SE Palmeiras	2	1	FINISHED	2026-03-12 22:30:00	\N	2026-04-26 00:49:25.814	2026-04-26 00:49:25.814	f	554789	f
47a723e3-4b34-4f2a-8438-7457633e6899	911f62b6-5eb8-4528-8c5a-dce66b43985c	São Paulo FC	Chapecoense AF	2	0	FINISHED	2026-03-12 23:00:00	\N	2026-04-26 00:49:25.816	2026-04-26 00:49:25.816	f	554788	f
0ce3b44e-fb49-4f93-8724-1359721bc597	911f62b6-5eb8-4528-8c5a-dce66b43985c	Grêmio FBPA	RB Bragantino	1	1	FINISHED	2026-03-13 00:30:00	\N	2026-04-26 00:49:25.818	2026-04-26 00:49:25.818	f	554785	f
f54d3524-822a-4992-bcaa-c0caf7b2679a	0568340c-0864-4385-8e79-0ee0a99b6623	EC Vitória	CA Mineiro	2	0	FINISHED	2026-03-14 21:30:00	\N	2026-04-26 00:49:25.82	2026-04-26 00:49:25.82	f	554799	f
334d90b6-9c5f-49c8-a1da-22f945937081	0568340c-0864-4385-8e79-0ee0a99b6623	Botafogo FR	CR Flamengo	0	3	FINISHED	2026-03-14 23:30:00	\N	2026-04-26 00:49:25.822	2026-04-26 00:49:25.822	f	554790	f
eec4f795-cca4-4742-a77a-59c424f51131	0568340c-0864-4385-8e79-0ee0a99b6623	Fluminense FC	CA Paranaense	3	2	FINISHED	2026-03-15 19:00:00	\N	2026-04-26 00:49:25.824	2026-04-26 00:49:25.824	f	554795	f
dfa7c8a4-de3a-4d9f-90a0-c4fed51c3997	0568340c-0864-4385-8e79-0ee0a99b6623	SC Internacional	EC Bahia	0	1	FINISHED	2026-03-15 19:00:00	\N	2026-04-26 00:49:25.826	2026-04-26 00:49:25.826	f	554796	f
26c8870b-413d-4f18-b78f-bcde7065a815	0568340c-0864-4385-8e79-0ee0a99b6623	Santos FC	SC Corinthians Paulista	1	1	FINISHED	2026-03-15 19:00:00	\N	2026-04-26 00:49:25.828	2026-04-26 00:49:25.828	f	554798	f
ca889190-7bbb-4403-8fad-181efe835df1	0568340c-0864-4385-8e79-0ee0a99b6623	Coritiba FBC	Clube do Remo	1	0	FINISHED	2026-03-15 21:30:00	\N	2026-04-26 00:49:25.829	2026-04-26 00:49:25.829	f	554793	f
3d601c4c-09cc-4816-8492-55da975bbdc6	0568340c-0864-4385-8e79-0ee0a99b6623	SE Palmeiras	Mirassol FC	1	0	FINISHED	2026-03-15 21:30:00	\N	2026-04-26 00:49:25.831	2026-04-26 00:49:25.831	f	554797	f
e0308ecb-be7d-47fb-a0d5-e440d95992cd	0568340c-0864-4385-8e79-0ee0a99b6623	RB Bragantino	São Paulo FC	1	2	FINISHED	2026-03-15 23:30:00	\N	2026-04-26 00:49:25.833	2026-04-26 00:49:25.833	f	554791	f
01693cc1-1dca-4187-9022-b440911dc9b4	0568340c-0864-4385-8e79-0ee0a99b6623	Cruzeiro EC	CR Vasco da Gama	3	3	FINISHED	2026-03-15 23:30:00	\N	2026-04-26 00:49:25.835	2026-04-26 00:49:25.835	f	554794	f
7d49aa7f-2b05-41b0-8ea1-3ed0e9a8cdab	0568340c-0864-4385-8e79-0ee0a99b6623	Chapecoense AF	Grêmio FBPA	1	1	FINISHED	2026-03-16 23:00:00	\N	2026-04-26 00:49:25.837	2026-04-26 00:49:25.837	f	554792	f
a7aa4bab-712b-4778-8ab8-3fc03597a647	f61489de-6fe2-4f37-854c-5ecf524da2fe	EC Bahia	RB Bragantino	2	0	FINISHED	2026-03-18 22:00:00	\N	2026-04-26 00:49:25.839	2026-04-26 00:49:25.839	f	554802	f
ed71bd25-585f-4935-a2b4-098574154ac7	f61489de-6fe2-4f37-854c-5ecf524da2fe	SE Palmeiras	Botafogo FR	2	1	FINISHED	2026-03-18 22:00:00	\N	2026-04-26 00:49:25.842	2026-04-26 00:49:25.842	f	554807	f
76aab288-85b5-4af2-85b9-9d7ddf48029a	f61489de-6fe2-4f37-854c-5ecf524da2fe	CA Paranaense	Cruzeiro EC	2	1	FINISHED	2026-03-18 22:30:00	\N	2026-04-26 00:49:25.843	2026-04-26 00:49:25.843	f	554800	f
ea69c55f-8ef3-42c2-98a2-40a4919eac18	f61489de-6fe2-4f37-854c-5ecf524da2fe	CA Mineiro	São Paulo FC	1	0	FINISHED	2026-03-18 23:00:00	\N	2026-04-26 00:49:25.845	2026-04-26 00:49:25.845	f	554801	f
08ae2c9a-0cfd-4fbc-89c1-a757fb3b6948	f61489de-6fe2-4f37-854c-5ecf524da2fe	Mirassol FC	Coritiba FBC	0	1	FINISHED	2026-03-18 23:00:00	\N	2026-04-26 00:49:25.847	2026-04-26 00:49:25.847	f	554806	f
6500a07f-0f4b-4f44-ab92-0af4d91aec40	f61489de-6fe2-4f37-854c-5ecf524da2fe	Santos FC	SC Internacional	1	2	FINISHED	2026-03-19 00:30:00	\N	2026-04-26 00:49:25.849	2026-04-26 00:49:25.849	f	554808	f
064b463f-7b4e-400a-9bc2-e4c8ef44adab	f61489de-6fe2-4f37-854c-5ecf524da2fe	CR Vasco da Gama	Fluminense FC	3	2	FINISHED	2026-03-19 00:30:00	\N	2026-04-26 00:49:25.851	2026-04-26 00:49:25.851	f	554809	f
f9ad481a-2aba-4f66-8123-9a14f5e64d02	f61489de-6fe2-4f37-854c-5ecf524da2fe	Grêmio FBPA	EC Vitória	2	0	FINISHED	2026-03-19 22:00:00	\N	2026-04-26 00:49:25.852	2026-04-26 00:49:25.852	f	554805	f
e85f0c38-6371-4e25-ab5f-0303f01247c5	f61489de-6fe2-4f37-854c-5ecf524da2fe	CR Flamengo	Clube do Remo	3	0	FINISHED	2026-03-19 23:00:00	\N	2026-04-26 00:49:25.854	2026-04-26 00:49:25.854	f	554804	f
30dadb25-9c6b-486f-a7ca-f4ee6c44807c	f61489de-6fe2-4f37-854c-5ecf524da2fe	Chapecoense AF	SC Corinthians Paulista	0	0	FINISHED	2026-03-20 00:30:00	\N	2026-04-26 00:49:25.856	2026-04-26 00:49:25.856	f	554803	f
3362ec27-62bf-41a6-a7da-53dd8aa3bb84	fe0f8e89-f7be-4a65-89e6-7cddd3ba67aa	RB Bragantino	Botafogo FR	1	2	FINISHED	2026-03-21 19:00:00	\N	2026-04-26 00:49:25.858	2026-04-26 00:49:25.858	f	554811	f
dbfdf484-3d0b-4d26-9a56-c390aa494523	fe0f8e89-f7be-4a65-89e6-7cddd3ba67aa	Fluminense FC	CA Mineiro	1	0	FINISHED	2026-03-21 21:30:00	\N	2026-04-26 00:49:25.86	2026-04-26 00:49:25.86	f	554814	f
c8cb0abc-c2ea-4cf9-90fc-ea7a4abe7d94	fe0f8e89-f7be-4a65-89e6-7cddd3ba67aa	São Paulo FC	SE Palmeiras	0	1	FINISHED	2026-03-22 00:00:00	\N	2026-04-26 00:49:25.861	2026-04-26 00:49:25.861	f	554817	f
d3917c55-9632-40ac-b477-7f4d8497481d	fe0f8e89-f7be-4a65-89e6-7cddd3ba67aa	CA Paranaense	Coritiba FBC	2	0	FINISHED	2026-03-22 19:00:00	\N	2026-04-26 00:49:25.863	2026-04-26 00:49:25.863	f	554810	f
85353ce4-f405-4153-8c16-cfe41205c7e5	fe0f8e89-f7be-4a65-89e6-7cddd3ba67aa	Cruzeiro EC	Santos FC	0	0	FINISHED	2026-03-22 19:00:00	\N	2026-04-26 00:49:25.865	2026-04-26 00:49:25.865	f	554813	f
1359818d-2699-4de9-9076-bb0cd6afb611	fe0f8e89-f7be-4a65-89e6-7cddd3ba67aa	Clube do Remo	EC Bahia	4	1	FINISHED	2026-03-22 19:00:00	\N	2026-04-26 00:49:25.867	2026-04-26 00:49:25.867	f	554816	f
477989f0-cbc1-4535-8823-f884a413fba0	fe0f8e89-f7be-4a65-89e6-7cddd3ba67aa	CR Vasco da Gama	Grêmio FBPA	2	1	FINISHED	2026-03-22 19:00:00	\N	2026-04-26 00:49:25.87	2026-04-26 00:49:25.87	f	554818	f
4f39010e-339f-4d2e-80ad-e5cf21506e5d	fe0f8e89-f7be-4a65-89e6-7cddd3ba67aa	SC Internacional	Chapecoense AF	2	0	FINISHED	2026-03-22 21:30:00	\N	2026-04-26 00:49:25.871	2026-04-26 00:49:25.871	f	554815	f
a52ddc59-1d91-4e1c-b6f3-6331f3f3e659	fe0f8e89-f7be-4a65-89e6-7cddd3ba67aa	EC Vitória	Mirassol FC	1	0	FINISHED	2026-03-22 21:30:00	\N	2026-04-26 00:49:25.873	2026-04-26 00:49:25.873	f	554819	f
a25110d1-0282-47d8-973f-f0cacf72006e	fe0f8e89-f7be-4a65-89e6-7cddd3ba67aa	SC Corinthians Paulista	CR Flamengo	1	1	FINISHED	2026-03-22 23:30:00	\N	2026-04-26 00:49:25.875	2026-04-26 00:49:25.875	f	554812	f
db02ca95-4785-4211-ac27-f6d944d2637a	911f62b6-5eb8-4528-8c5a-dce66b43985c	CA Paranaense	Botafogo FR	4	1	FINISHED	2026-03-29 22:30:00	\N	2026-04-26 00:49:25.877	2026-04-26 00:49:25.877	f	554780	f
9041ba1d-090d-4763-bbd6-64d17fa65199	67eb3578-5f6b-4cf4-b848-8140e66fdea2	Botafogo FR	Mirassol FC	3	2	FINISHED	2026-04-01 22:30:00	\N	2026-04-26 00:49:25.879	2026-04-26 00:49:25.879	f	554821	f
f439335d-b719-4b81-beb6-d054f4654901	67eb3578-5f6b-4cf4-b848-8140e66fdea2	SC Internacional	São Paulo FC	1	1	FINISHED	2026-04-01 22:30:00	\N	2026-04-26 00:49:25.881	2026-04-26 00:49:25.881	f	554827	f
c4f89ea0-b140-47f9-b700-96a6a364afd7	67eb3578-5f6b-4cf4-b848-8140e66fdea2	EC Bahia	CA Paranaense	3	0	FINISHED	2026-04-01 23:00:00	\N	2026-04-26 00:49:25.883	2026-04-26 00:49:25.883	f	554820	f
3e138814-91ef-4f81-bdbe-9b389a34aa05	67eb3578-5f6b-4cf4-b848-8140e66fdea2	Cruzeiro EC	EC Vitória	3	0	FINISHED	2026-04-01 23:00:00	\N	2026-04-26 00:49:25.888	2026-04-26 00:49:25.888	f	554825	f
b0a4aba9-5186-4b3a-a6e9-aec6a0135f14	67eb3578-5f6b-4cf4-b848-8140e66fdea2	Coritiba FBC	CR Vasco da Gama	1	1	FINISHED	2026-04-01 23:30:00	\N	2026-04-26 00:49:25.89	2026-04-26 00:49:25.89	f	554824	f
c400fba8-8b1d-4ad1-94ba-93cb3d764882	67eb3578-5f6b-4cf4-b848-8140e66fdea2	Fluminense FC	SC Corinthians Paulista	3	1	FINISHED	2026-04-02 00:30:00	\N	2026-04-26 00:49:25.895	2026-04-26 00:49:25.895	f	554826	f
0bf1313d-2d24-4fdb-8b69-a6ea71362bd3	67eb3578-5f6b-4cf4-b848-8140e66fdea2	Chapecoense AF	CA Mineiro	0	4	FINISHED	2026-04-02 22:00:00	\N	2026-04-26 00:49:25.897	2026-04-26 00:49:25.897	f	554823	f
fdb2c533-b150-4da9-9f06-df671adf322c	67eb3578-5f6b-4cf4-b848-8140e66fdea2	Santos FC	Clube do Remo	2	0	FINISHED	2026-04-02 22:00:00	\N	2026-04-26 00:49:25.899	2026-04-26 00:49:25.899	f	554829	f
ac9120a1-999a-4fea-9af7-90c8c0bfac21	67eb3578-5f6b-4cf4-b848-8140e66fdea2	RB Bragantino	CR Flamengo	3	0	FINISHED	2026-04-03 00:30:00	\N	2026-04-26 00:49:25.904	2026-04-26 00:49:25.904	f	554822	f
931d7792-cf6f-469b-bccc-58f84f1f2269	67eb3578-5f6b-4cf4-b848-8140e66fdea2	SE Palmeiras	Grêmio FBPA	2	1	FINISHED	2026-04-03 00:30:00	\N	2026-04-26 00:49:25.907	2026-04-26 00:49:25.907	f	554828	f
46adf1b2-8d9e-4660-a7d3-f71a0f91af2d	e327d7c5-ad60-4967-af2b-b4fe2c06dd32	São Paulo FC	Cruzeiro EC	4	1	FINISHED	2026-04-04 21:30:00	\N	2026-04-26 00:49:25.909	2026-04-26 00:49:25.909	f	554838	f
03cab7c3-6573-4c58-8b8d-4b58fdc600e7	e327d7c5-ad60-4967-af2b-b4fe2c06dd32	Coritiba FBC	Fluminense FC	1	1	FINISHED	2026-04-04 23:30:00	\N	2026-04-26 00:49:25.91	2026-04-26 00:49:25.91	f	554834	f
d41b62a8-c5e9-4164-8311-ba5688cd9f1f	e327d7c5-ad60-4967-af2b-b4fe2c06dd32	CR Vasco da Gama	Botafogo FR	1	2	FINISHED	2026-04-05 00:00:00	\N	2026-04-26 00:49:25.912	2026-04-26 00:49:25.912	f	554839	f
f0439fdc-4024-477d-8fa7-5da1723a43ea	e327d7c5-ad60-4967-af2b-b4fe2c06dd32	Chapecoense AF	EC Vitória	1	1	FINISHED	2026-04-05 19:00:00	\N	2026-04-26 00:49:25.914	2026-04-26 00:49:25.914	f	554832	f
9a80feca-65a1-49e0-bee4-1fb626e3f7ba	e327d7c5-ad60-4967-af2b-b4fe2c06dd32	CA Mineiro	CA Paranaense	2	1	FINISHED	2026-04-05 20:30:00	\N	2026-04-26 00:49:25.915	2026-04-26 00:49:25.915	f	554830	f
af5ed156-3ec9-4502-b7d4-2b8f3c97627c	e327d7c5-ad60-4967-af2b-b4fe2c06dd32	CR Flamengo	Santos FC	3	1	FINISHED	2026-04-05 20:30:00	\N	2026-04-26 00:49:25.917	2026-04-26 00:49:25.917	f	554835	f
48272c5e-dffa-4035-8a09-ffcbef09d2cb	e327d7c5-ad60-4967-af2b-b4fe2c06dd32	EC Bahia	SE Palmeiras	1	2	FINISHED	2026-04-05 22:30:00	\N	2026-04-26 00:49:25.918	2026-04-26 00:49:25.918	f	554831	f
dc7d984b-4bf3-4275-bc2d-12a01a3944d5	e327d7c5-ad60-4967-af2b-b4fe2c06dd32	SC Corinthians Paulista	SC Internacional	0	1	FINISHED	2026-04-05 22:30:00	\N	2026-04-26 00:49:25.92	2026-04-26 00:49:25.92	f	554833	f
9a55f17d-cf28-45e6-b7a8-daa9a1c1e1ec	e327d7c5-ad60-4967-af2b-b4fe2c06dd32	Mirassol FC	RB Bragantino	0	1	FINISHED	2026-04-05 23:00:00	\N	2026-04-26 00:49:25.921	2026-04-26 00:49:25.921	f	554837	f
d9033ebd-68d5-446b-bc71-95793931fc77	e327d7c5-ad60-4967-af2b-b4fe2c06dd32	Grêmio FBPA	Clube do Remo	0	0	FINISHED	2026-04-05 23:30:00	\N	2026-04-26 00:49:25.923	2026-04-26 00:49:25.923	f	554836	f
8cb7383f-e956-4976-972a-c8f9b379ef41	3ef72c86-8497-4441-85fe-b508ffb0bcd1	Clube do Remo	CR Vasco da Gama	1	1	FINISHED	2026-04-11 19:30:00	\N	2026-04-26 00:49:25.925	2026-04-26 00:49:25.925	f	554847	f
4c3093a9-aff8-43e3-876f-35267d9bcecf	3ef72c86-8497-4441-85fe-b508ffb0bcd1	EC Vitória	São Paulo FC	2	0	FINISHED	2026-04-11 19:30:00	\N	2026-04-26 00:49:25.927	2026-04-26 00:49:25.927	f	554849	f
d98928ed-b1aa-46be-bba8-f5967750741b	3ef72c86-8497-4441-85fe-b508ffb0bcd1	Mirassol FC	EC Bahia	1	2	FINISHED	2026-04-11 21:30:00	\N	2026-04-26 00:49:25.928	2026-04-26 00:49:25.928	f	554846	f
91e7ecb4-077c-4649-b98c-d448dec81334	3ef72c86-8497-4441-85fe-b508ffb0bcd1	Santos FC	CA Mineiro	1	0	FINISHED	2026-04-11 23:00:00	\N	2026-04-26 00:49:25.93	2026-04-26 00:49:25.93	f	554848	f
5ee4d04d-e19a-4abb-be4c-09221615513b	3ef72c86-8497-4441-85fe-b508ffb0bcd1	SC Internacional	Grêmio FBPA	0	0	FINISHED	2026-04-11 23:30:00	\N	2026-04-26 00:49:25.931	2026-04-26 00:49:25.931	f	554845	f
ff1e3bc2-44bd-429c-a071-0038a0bfb1f5	3ef72c86-8497-4441-85fe-b508ffb0bcd1	CA Paranaense	Chapecoense AF	2	0	FINISHED	2026-04-12 14:00:00	\N	2026-04-26 00:49:25.933	2026-04-26 00:49:25.933	f	554840	f
bf9841e7-af67-489d-8249-c4fc4c0ce903	3ef72c86-8497-4441-85fe-b508ffb0bcd1	Botafogo FR	Coritiba FBC	2	2	FINISHED	2026-04-12 19:00:00	\N	2026-04-26 00:49:25.934	2026-04-26 00:49:25.934	f	554841	f
9825906f-b355-449f-877a-9c164776ebd0	3ef72c86-8497-4441-85fe-b508ffb0bcd1	Fluminense FC	CR Flamengo	1	2	FINISHED	2026-04-12 21:00:00	\N	2026-04-26 00:49:25.936	2026-04-26 00:49:25.936	f	554844	f
0f4b59dd-84b5-4db0-87dc-9f7cc96722c0	3ef72c86-8497-4441-85fe-b508ffb0bcd1	SC Corinthians Paulista	SE Palmeiras	0	0	FINISHED	2026-04-12 21:30:00	\N	2026-04-26 00:49:25.938	2026-04-26 00:49:25.938	f	554842	f
1104a6aa-ac4e-4aac-9cc9-06ac14cf9d6a	3ef72c86-8497-4441-85fe-b508ffb0bcd1	Cruzeiro EC	RB Bragantino	2	1	FINISHED	2026-04-12 21:30:00	\N	2026-04-26 00:49:25.94	2026-04-26 00:49:25.94	f	554843	f
aff738ae-7952-430c-80be-acf3d4504acf	f2a710de-e1c4-4131-ac1f-8e447effdd1f	Chapecoense AF	Botafogo FR	1	4	FINISHED	2026-04-18 21:30:00	\N	2026-04-26 00:49:25.942	2026-04-26 00:49:25.942	f	554851	f
4792f076-7887-4650-9aed-0e6a664cf4c6	f2a710de-e1c4-4131-ac1f-8e447effdd1f	CR Vasco da Gama	São Paulo FC	2	1	FINISHED	2026-04-18 21:30:00	\N	2026-04-26 00:49:25.943	2026-04-26 00:49:25.943	f	554858	f
b2a1e3cc-3829-4eba-b6e6-41212fcf142b	f2a710de-e1c4-4131-ac1f-8e447effdd1f	EC Vitória	SC Corinthians Paulista	0	0	FINISHED	2026-04-18 23:00:00	\N	2026-04-26 00:49:25.945	2026-04-26 00:49:25.945	f	554859	f
57bf6268-0f7a-4a01-86ef-7088ebcc63fb	f2a710de-e1c4-4131-ac1f-8e447effdd1f	Cruzeiro EC	Grêmio FBPA	2	0	FINISHED	2026-04-18 23:30:00	\N	2026-04-26 00:49:25.947	2026-04-26 00:49:25.947	f	554853	f
2ed23c23-9ed4-4b46-89ad-0b7aeb16074a	f2a710de-e1c4-4131-ac1f-8e447effdd1f	SC Internacional	Mirassol FC	1	2	FINISHED	2026-04-19 14:00:00	\N	2026-04-26 00:49:25.948	2026-04-26 00:49:25.948	f	554855	f
ab79619b-06a0-4461-8aff-ebb6c570e423	f2a710de-e1c4-4131-ac1f-8e447effdd1f	Coritiba FBC	CA Mineiro	2	0	FINISHED	2026-04-19 19:00:00	\N	2026-04-26 00:49:25.951	2026-04-26 00:49:25.951	f	554852	f
52e8cf2e-2579-4f95-96cd-fa729160f628	f2a710de-e1c4-4131-ac1f-8e447effdd1f	Santos FC	Fluminense FC	2	3	FINISHED	2026-04-19 19:00:00	\N	2026-04-26 00:49:25.953	2026-04-26 00:49:25.953	f	554857	f
76fe8826-db5f-4cca-90ab-2e2b440c35e3	f2a710de-e1c4-4131-ac1f-8e447effdd1f	RB Bragantino	Clube do Remo	4	2	FINISHED	2026-04-19 21:30:00	\N	2026-04-26 00:49:25.955	2026-04-26 00:49:25.955	f	554850	f
c9cb9800-2fc8-41b9-8983-cb1e514014d6	f2a710de-e1c4-4131-ac1f-8e447effdd1f	SE Palmeiras	CA Paranaense	1	0	FINISHED	2026-04-19 21:30:00	\N	2026-04-26 00:49:25.956	2026-04-26 00:49:25.956	f	554856	f
079d7282-6371-43f2-8962-77c5fd1b86ca	f2a710de-e1c4-4131-ac1f-8e447effdd1f	CR Flamengo	EC Bahia	2	0	FINISHED	2026-04-19 22:30:00	\N	2026-04-26 00:49:25.958	2026-04-26 00:49:25.958	f	554854	f
80ea2aef-c590-4a31-8f3f-6b1646c16f37	9ad8393a-13a3-4237-ad1f-90521cc1730b	Grêmio FBPA	Coritiba FBC	1	0	FINISHED	2026-04-26 19:00:00	\N	2026-04-24 17:54:22.368	2026-04-27 20:46:01.643	f	554867	f
0c2f91e1-1ef8-4c0a-b721-1cf3bf1e16ec	9ad8393a-13a3-4237-ad1f-90521cc1730b	Fluminense FC	Chapecoense AF	2	1	FINISHED	2026-04-26 23:30:00	\N	2026-04-24 17:54:22.376	2026-04-28 01:23:09.775	f	554866	t
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: willianlima
--

COPY public.notifications (id, user_id, pool_id, type, title, message, is_read, created_at, read_at) FROM stdin;
75216d9d-3a44-4a9b-8f68-d1d93c28af22	8a36dcce-075f-4835-b3c4-bbf56b838a6e	\N	NEXT_MATCH_REMINDER	Atenção	[93ed5db1-9057-4433-a015-91c0c56d5063] Seu próximo jogo fecha em 119 minutos	t	2026-04-14 21:00:00.056	2026-04-14 23:40:51.146
1da5e32f-6947-4b06-a489-8cc72b9dfcf6	08eda72e-1ac1-414d-8da4-4872e9782c53	\N	NEXT_MATCH_REMINDER	Palpite pendente	[PENDING:55db40b5-4c4b-4b94-84f0-b5834d9ff6dd] Você ainda não palpitou o próximo jogo	f	2026-04-15 21:13:00.083	\N
57da3a4f-c892-4663-95fe-cbfa976d0c2e	a58863b4-491b-4d1f-b35f-f8f8ad39a09d	\N	NEXT_MATCH_REMINDER	Teste	Teste agora	f	2026-04-14 23:45:53.815	\N
120fa58e-85d1-4023-88f1-54952e2fcf61	a58863b4-491b-4d1f-b35f-f8f8ad39a09d	\N	NEXT_MATCH_REMINDER	Teste	Teste agora	f	2026-04-14 23:47:17.275	\N
2c88d23e-6156-4764-8e30-40a9fc91f48f	8a36dcce-075f-4835-b3c4-bbf56b838a6e	\N	NEXT_MATCH_REMINDER	Teste	Teste agora	t	2026-04-14 23:55:44.445	2026-04-14 23:56:02.654
dd87d753-8015-40e2-a28e-792e3ec7c25a	8a36dcce-075f-4835-b3c4-bbf56b838a6e	\N	NEXT_MATCH_REMINDER	Teste 1	Primeira notificação	t	2026-04-15 00:15:45.942	2026-04-15 00:16:01.822
e82ca0e8-9829-4c51-9c52-de07af4ad144	8a36dcce-075f-4835-b3c4-bbf56b838a6e	\N	NEXT_MATCH_REMINDER	Teste 2	Segunda notificação	t	2026-04-15 00:15:45.942	2026-04-15 00:16:01.822
45386133-22f8-4e8c-928c-91e7eeb6b82a	8a36dcce-075f-4835-b3c4-bbf56b838a6e	\N	NEXT_MATCH_REMINDER	Urgente	Falta pouco para o fechamento	t	2026-04-15 00:19:36.812	2026-04-15 00:20:20.116
de55b46d-5b99-470f-a0ef-27711cf87e8d	8a36dcce-075f-4835-b3c4-bbf56b838a6e	\N	NEXT_MATCH_REMINDER	Lembrete	Você ainda tem um jogo para conferir	t	2026-04-15 00:19:36.812	2026-04-15 00:20:20.116
9ef31062-0eb9-422d-a4d5-9328fc16403d	8a36dcce-075f-4835-b3c4-bbf56b838a6e	\N	NEXT_MATCH_REMINDER	Atenção	Última chance de palpitar	t	2026-04-15 00:37:26.676	2026-04-15 00:38:02.943
a62aa67c-ec24-48b3-9cbc-8d481887cb66	8a36dcce-075f-4835-b3c4-bbf56b838a6e	\N	NEXT_MATCH_REMINDER	Urgente	Faltam poucos minutos	t	2026-04-15 00:37:26.676	2026-04-15 00:38:09.507
59997e4d-f6fd-4a0e-bff3-54b89aabf3d2	8a36dcce-075f-4835-b3c4-bbf56b838a6e	\N	NEXT_MATCH_REMINDER	Última chamada	Palpite fecha agora	t	2026-04-15 00:40:56.879	2026-04-15 00:43:35.805
eff970e7-7a9e-4cc7-acda-a16c3cec74f5	8a36dcce-075f-4835-b3c4-bbf56b838a6e	\N	NEXT_MATCH_REMINDER	Urgente	Faltam 5 minutos	t	2026-04-15 00:40:56.879	2026-04-15 00:43:36.561
01139668-434e-4414-a375-10739dfa0d91	8a36dcce-075f-4835-b3c4-bbf56b838a6e	\N	NEXT_MATCH_REMINDER	Palpite pendente	[PENDING:6b50dad2-95f3-4a5f-9d0c-a67e057627fe] Você ainda não palpitou o próximo jogo	t	2026-04-15 23:40:00.031	2026-04-15 23:41:08.418
815585aa-da33-4860-bd28-4e569054aef7	8a36dcce-075f-4835-b3c4-bbf56b838a6e	\N	NEXT_MATCH_REMINDER	Aviso	Jogo quase começando	t	2026-04-15 00:40:56.879	2026-04-15 00:43:37.106
92e22d43-c56c-43f3-bcfd-0c0a315a2491	8a36dcce-075f-4835-b3c4-bbf56b838a6e	\N	NEXT_MATCH_REMINDER	Lembrete	Ainda dá tempo de revisar	t	2026-04-15 00:51:16.336	2026-04-15 01:15:08.761
1883243f-a38f-4ea7-bd2f-6c54ceff0c9b	8a36dcce-075f-4835-b3c4-bbf56b838a6e	\N	NEXT_MATCH_REMINDER	Urgente	Faltam poucos minutos	t	2026-04-15 00:51:16.336	2026-04-15 01:15:09.552
8f1280ad-a147-4a85-863f-68979ffa5238	8a36dcce-075f-4835-b3c4-bbf56b838a6e	\N	NEXT_MATCH_REMINDER	Última chamada	Faltam segundos para fechar	t	2026-04-15 00:51:16.336	2026-04-15 01:15:10.197
39e91067-701c-4f79-9525-f6bc790fa8e0	8a36dcce-075f-4835-b3c4-bbf56b838a6e	\N	NEXT_MATCH_REMINDER	Última chamada	Faltam segundos	t	2026-04-15 01:17:06.176	2026-04-15 13:30:32.527
0c95cdf9-743d-4da4-ab27-c3d4a298da06	8a36dcce-075f-4835-b3c4-bbf56b838a6e	\N	NEXT_MATCH_REMINDER	Urgente	Faltam poucos minutos	t	2026-04-15 01:17:06.176	2026-04-15 13:30:32.527
4bd1be9a-fd66-4042-95d3-d64c257e5c6a	8a36dcce-075f-4835-b3c4-bbf56b838a6e	\N	NEXT_MATCH_REMINDER	Lembrete	Revise seu palpite	t	2026-04-15 01:17:06.176	2026-04-15 13:30:32.527
8c4b81d9-57ff-428a-bad3-0372f34d8e31	08eda72e-1ac1-414d-8da4-4872e9782c53	\N	NEXT_MATCH_REMINDER	Palpite pendente	Você ainda não palpitou o próximo jogo	f	2026-04-15 14:11:00.09	\N
9082f5ff-76ea-4aeb-903b-333c8ef13e29	8277529b-d97a-4cae-9a52-d3cac39cbec0	\N	NEXT_MATCH_REMINDER	Palpite pendente	Você ainda não palpitou o próximo jogo	f	2026-04-15 14:11:00.092	\N
03e051f2-eb5f-4906-84dd-98296e281e14	a58863b4-491b-4d1f-b35f-f8f8ad39a09d	\N	NEXT_MATCH_REMINDER	Palpite pendente	Você ainda não palpitou o próximo jogo	f	2026-04-15 14:11:00.094	\N
c1bc2003-3e30-4298-9855-f6745d2df1ea	08eda72e-1ac1-414d-8da4-4872e9782c53	\N	NEXT_MATCH_REMINDER	Palpite pendente	[0496101e-3e8b-4589-b8e4-28a4747e2923] Você ainda não palpitou o próximo jogo	f	2026-04-15 14:17:00.086	\N
9ca49625-9694-4dfb-80f9-8377a7934724	8277529b-d97a-4cae-9a52-d3cac39cbec0	\N	NEXT_MATCH_REMINDER	Palpite pendente	[0496101e-3e8b-4589-b8e4-28a4747e2923] Você ainda não palpitou o próximo jogo	f	2026-04-15 14:17:00.089	\N
8e9cc6a1-e414-46da-a7e9-2f9c74f5de28	a58863b4-491b-4d1f-b35f-f8f8ad39a09d	\N	NEXT_MATCH_REMINDER	Palpite pendente	[0496101e-3e8b-4589-b8e4-28a4747e2923] Você ainda não palpitou o próximo jogo	f	2026-04-15 14:17:00.091	\N
dad364cf-6ee9-422d-969e-264ab19f0105	8a36dcce-075f-4835-b3c4-bbf56b838a6e	\N	NEXT_MATCH_REMINDER	Atenção	Seu próximo jogo fecha em 1 minutos	t	2026-04-18 19:30:00.038	2026-04-18 21:35:50.313
0166df00-e702-446d-9679-35882dec86c3	08eda72e-1ac1-414d-8da4-4872e9782c53	\N	NEXT_MATCH_REMINDER	Palpite pendente	Você ainda não palpitou o próximo jogo	f	2026-04-18 19:30:00.027	\N
08cb5b1e-b366-4512-b8bb-84a6b00e5672	8277529b-d97a-4cae-9a52-d3cac39cbec0	\N	NEXT_MATCH_REMINDER	Palpite pendente	Você ainda não palpitou o próximo jogo	f	2026-04-18 19:30:00.035	\N
14da8d89-e56d-4426-b532-a08436968bc4	08eda72e-1ac1-414d-8da4-4872e9782c53	\N	NEXT_MATCH_REMINDER	Palpite pendente	Você ainda não palpitou o próximo jogo	f	2026-04-15 14:18:00.048	\N
7c3a5b4d-0178-49a7-b827-c3d3cb76b221	8277529b-d97a-4cae-9a52-d3cac39cbec0	\N	NEXT_MATCH_REMINDER	Palpite pendente	Você ainda não palpitou o próximo jogo	f	2026-04-15 14:18:00.049	\N
9f5d8554-2a4c-488a-bc0e-2dba560e88a8	a58863b4-491b-4d1f-b35f-f8f8ad39a09d	\N	NEXT_MATCH_REMINDER	Palpite pendente	Você ainda não palpitou o próximo jogo	f	2026-04-18 19:30:00.036	\N
204b2354-596f-4712-98ea-91ff1c9d2219	a58863b4-491b-4d1f-b35f-f8f8ad39a09d	\N	NEXT_MATCH_REMINDER	Palpite pendente	Você ainda não palpitou o próximo jogo	f	2026-04-15 14:18:00.052	\N
d988aba4-817e-4727-87cd-41598d977079	8277529b-d97a-4cae-9a52-d3cac39cbec0	\N	NEXT_MATCH_REMINDER	Palpite pendente	[PENDING:55db40b5-4c4b-4b94-84f0-b5834d9ff6dd] Você ainda não palpitou o próximo jogo	f	2026-04-15 21:13:00.085	\N
78403063-b3ef-42d7-8395-7f60347e87d8	a58863b4-491b-4d1f-b35f-f8f8ad39a09d	\N	NEXT_MATCH_REMINDER	Palpite pendente	[PENDING:55db40b5-4c4b-4b94-84f0-b5834d9ff6dd] Você ainda não palpitou o próximo jogo	f	2026-04-15 21:13:00.089	\N
0b4b9cc8-f1dc-42dd-b938-459eb8ca4029	08eda72e-1ac1-414d-8da4-4872e9782c53	\N	NEXT_MATCH_REMINDER	Palpite pendente	[PENDING:6b50dad2-95f3-4a5f-9d0c-a67e057627fe] Você ainda não palpitou o próximo jogo	f	2026-04-15 23:40:00.05	\N
d3a1dae3-5f5a-4420-8bba-f95c7591e737	8277529b-d97a-4cae-9a52-d3cac39cbec0	\N	NEXT_MATCH_REMINDER	Palpite pendente	[PENDING:6b50dad2-95f3-4a5f-9d0c-a67e057627fe] Você ainda não palpitou o próximo jogo	f	2026-04-15 23:40:00.052	\N
196768cf-1c31-40b4-889c-453cd66efbbe	a58863b4-491b-4d1f-b35f-f8f8ad39a09d	\N	NEXT_MATCH_REMINDER	Palpite pendente	[PENDING:6b50dad2-95f3-4a5f-9d0c-a67e057627fe] Você ainda não palpitou o próximo jogo	f	2026-04-15 23:40:00.055	\N
35f3c4f3-ae3a-408d-8832-452348f810e0	8a36dcce-075f-4835-b3c4-bbf56b838a6e	\N	NEXT_MATCH_REMINDER	Teste auto-refresh	Isso deve aparecer sem dar refresh	t	2026-04-16 00:07:29.191	2026-04-16 18:10:42.677
38ec02bd-e656-4b3a-931b-ae8f8b4fb838	8a36dcce-075f-4835-b3c4-bbf56b838a6e	\N	NEXT_MATCH_REMINDER	Atenção	Seu próximo jogo fecha em 14 minutos	t	2026-04-26 19:45:00.028	2026-04-28 20:34:36.118
f683407f-c3e9-4d0e-b5ae-59711874bcb3	8a36dcce-075f-4835-b3c4-bbf56b838a6e	\N	NEXT_MATCH_REMINDER	Palpite pendente	Você ainda não palpitou o próximo jogo	t	2026-04-25 19:30:00.098	2026-04-28 20:34:37.528
c4dc9069-008e-47b6-8e32-844e689d5d4c	8a36dcce-075f-4835-b3c4-bbf56b838a6e	bf9367b3-94ed-4fdf-a107-81ac1c24fade	NEXT_MATCH_REMINDER	Atenção	Seu próximo jogo fecha em 89 minutos	f	2026-05-02 17:00:00.066	\N
\.


--
-- Data for Name: pool_members; Type: TABLE DATA; Schema: public; Owner: willianlima
--

COPY public.pool_members (id, user_id, pool_id, joined_at, score, favorite_team, heart_team_score) FROM stdin;
d9f4c017-f02e-4360-bc55-16530673df0e	8a36dcce-075f-4835-b3c4-bbf56b838a6e	bf9367b3-94ed-4fdf-a107-81ac1c24fade	2026-04-29 20:34:55.921	0	Fluminense FC	0
\.


--
-- Data for Name: pools; Type: TABLE DATA; Schema: public; Owner: willianlima
--

COPY public.pools (id, name, code, description, is_public, max_members, owner_id, championship_id, created_at, updated_at, is_active, bonus_round_id, starting_round_id) FROM stdin;
bf9367b3-94ed-4fdf-a107-81ac1c24fade	Brasileirão Serie A - Teste	VQ5402	\N	t	\N	8a36dcce-075f-4835-b3c4-bbf56b838a6e	bdc291fb-5642-4e39-920c-a1f38423e3d3	2026-04-29 20:34:55.921	2026-04-29 21:01:45.523	t	0f4da641-bbf8-46f9-b2f6-6f321a5508b3	0f4da641-bbf8-46f9-b2f6-6f321a5508b3
\.


--
-- Data for Name: predictions; Type: TABLE DATA; Schema: public; Owner: willianlima
--

COPY public.predictions (id, user_id, match_id, home_score_tip, away_score_tip, created_at, updated_at, pool_id, points, scored_at, is_joker) FROM stdin;
f0447681-11ce-4072-bf64-ddbcbba72f2f	8a36dcce-075f-4835-b3c4-bbf56b838a6e	f5f15ac1-5b7e-48ac-a088-c2354d635539	1	1	2026-04-29 21:01:05.67	2026-04-29 21:01:05.67	bf9367b3-94ed-4fdf-a107-81ac1c24fade	0	\N	f
efb7945a-ff50-487c-8d8f-e0209f6fc661	8a36dcce-075f-4835-b3c4-bbf56b838a6e	a8733cb2-1e63-4933-8dee-095019687835	1	0	2026-04-29 21:01:05.682	2026-04-29 21:01:05.682	bf9367b3-94ed-4fdf-a107-81ac1c24fade	0	\N	f
ab647715-0748-4465-9087-f74ee36b1dc7	8a36dcce-075f-4835-b3c4-bbf56b838a6e	5aeff406-b88e-47e3-962a-3a68ce8e6680	2	1	2026-04-29 21:01:05.693	2026-04-29 21:01:05.693	bf9367b3-94ed-4fdf-a107-81ac1c24fade	0	\N	f
38e1344d-e2f5-4ea7-9f51-05851f651a26	8a36dcce-075f-4835-b3c4-bbf56b838a6e	28e4885c-fe0e-42dc-af0f-9ade39d65f09	2	2	2026-04-29 21:01:05.706	2026-04-29 21:01:05.706	bf9367b3-94ed-4fdf-a107-81ac1c24fade	0	\N	f
281494eb-4f52-4d8d-b71a-b47705775b63	8a36dcce-075f-4835-b3c4-bbf56b838a6e	0cbf68ce-8f69-46e4-bf94-5eeeb20daea3	1	2	2026-04-29 21:01:05.717	2026-04-29 21:01:05.717	bf9367b3-94ed-4fdf-a107-81ac1c24fade	0	\N	f
787ba419-a63e-44f6-b7cf-995be72d43f4	8a36dcce-075f-4835-b3c4-bbf56b838a6e	5bcf9809-cb2c-43b5-b518-56ecf332d619	1	2	2026-04-29 21:01:05.73	2026-04-29 21:01:05.73	bf9367b3-94ed-4fdf-a107-81ac1c24fade	0	\N	f
8cf2ff7d-c1b8-4e20-a8f1-fbe35afc93b7	8a36dcce-075f-4835-b3c4-bbf56b838a6e	9da028f1-e592-4a70-b3d8-50afb5b7072a	1	1	2026-04-29 21:01:05.744	2026-04-29 21:01:05.744	bf9367b3-94ed-4fdf-a107-81ac1c24fade	0	\N	f
b5a503dc-78a9-41be-b22c-848ef40e206c	8a36dcce-075f-4835-b3c4-bbf56b838a6e	4152ad79-2354-4405-8dbb-ffd233d2401a	1	1	2026-04-29 21:06:21.221	2026-04-29 21:06:21.221	bf9367b3-94ed-4fdf-a107-81ac1c24fade	0	\N	f
12b39fba-875b-4d3d-b228-88ae7c4f6a4e	8a36dcce-075f-4835-b3c4-bbf56b838a6e	c1ac473c-c10b-44a0-bc01-a1189152b5c2	2	0	2026-04-29 21:09:26.178	2026-04-29 21:09:26.178	bf9367b3-94ed-4fdf-a107-81ac1c24fade	0	\N	f
27de4ecc-f462-47b9-ab4e-dea8779813d1	8a36dcce-075f-4835-b3c4-bbf56b838a6e	d013605a-60ce-4e80-9259-fb664e4902ef	1	1	2026-04-29 21:01:05.652	2026-04-29 21:28:57.815	bf9367b3-94ed-4fdf-a107-81ac1c24fade	0	\N	f
254aab55-a6d8-4811-85a0-30603223b91a	8a36dcce-075f-4835-b3c4-bbf56b838a6e	bf3359ed-f3ed-4729-85ed-9687abf750ea	3	1	2026-04-29 21:00:05.585	2026-04-30 23:48:19.274	bf9367b3-94ed-4fdf-a107-81ac1c24fade	0	\N	f
b5910268-d8e0-4a3e-adc9-98f8374a7618	8a36dcce-075f-4835-b3c4-bbf56b838a6e	bdf783b6-2567-4c80-8a75-42a784dfa5fd	3	1	2026-04-30 23:48:23.831	2026-04-30 23:48:23.831	bf9367b3-94ed-4fdf-a107-81ac1c24fade	0	\N	f
\.


--
-- Data for Name: round_winners; Type: TABLE DATA; Schema: public; Owner: willianlima
--

COPY public.round_winners (id, pool_id, round_id, user_id, favorite_team, round_points, created_at) FROM stdin;
\.


--
-- Data for Name: rounds; Type: TABLE DATA; Schema: public; Owner: willianlima
--

COPY public.rounds (id, championship_id, number, name, start_date, end_date, is_open, created_at) FROM stdin;
baf3d71e-6b46-4b98-89d9-9eb175a479a5	43ee45b7-e703-48bf-a712-d45ee98f61ba	1	Oitavas de Final	2026-04-15 00:00:00	2026-04-16 00:00:00	t	2026-04-06 21:59:16.486
9ad8393a-13a3-4237-ad1f-90521cc1730b	bdc291fb-5642-4e39-920c-a1f38423e3d3	13	Rodada 13	2026-04-25 21:30:00	2026-04-25 21:30:00	f	2026-04-24 17:54:22.344
0f4da641-bbf8-46f9-b2f6-6f321a5508b3	bdc291fb-5642-4e39-920c-a1f38423e3d3	14	Rodada 14	2026-05-02 19:00:00	2026-05-02 19:00:00	f	2026-04-24 17:54:22.377
026507b4-7987-4136-8ee0-190419d9a666	bdc291fb-5642-4e39-920c-a1f38423e3d3	15	Rodada 15	2026-05-09 19:00:00	2026-05-09 19:00:00	f	2026-04-24 17:54:22.394
938b2909-3c3d-4198-86a5-53f113f75d94	bdc291fb-5642-4e39-920c-a1f38423e3d3	16	Rodada 16	2026-05-16 21:30:00	2026-05-16 21:30:00	f	2026-04-24 17:54:22.411
af256016-3174-4e4e-bc81-9b4cbd5da959	bdc291fb-5642-4e39-920c-a1f38423e3d3	17	Rodada 17	2026-05-23 20:00:00	2026-05-23 20:00:00	f	2026-04-24 17:54:22.427
3a93b705-1efe-404d-a00a-ffabd146facf	bdc291fb-5642-4e39-920c-a1f38423e3d3	18	Rodada 18	2026-05-30 00:00:00	2026-05-30 00:00:00	f	2026-04-24 17:54:22.443
c541dd92-68bc-4d42-86d3-c5babdb65757	bdc291fb-5642-4e39-920c-a1f38423e3d3	19	Rodada 19	2026-07-22 00:00:00	2026-07-22 00:00:00	f	2026-04-24 17:54:22.454
f2d14b6d-cec6-477c-9f20-d3b82bf0d51b	bdc291fb-5642-4e39-920c-a1f38423e3d3	20	Rodada 20	2026-07-25 00:00:00	2026-07-25 00:00:00	f	2026-04-24 17:54:22.464
97fb39bf-eadb-4715-a076-13b30710949d	bdc291fb-5642-4e39-920c-a1f38423e3d3	21	Rodada 21	2026-07-29 00:00:00	2026-07-29 00:00:00	f	2026-04-24 17:54:22.474
6e91ad80-1f0f-49e3-a1bf-76d12c897635	bdc291fb-5642-4e39-920c-a1f38423e3d3	22	Rodada 22	2026-08-08 00:00:00	2026-08-08 00:00:00	f	2026-04-24 17:54:22.484
12eefa79-d996-4bd2-b570-0712f479bd2b	bdc291fb-5642-4e39-920c-a1f38423e3d3	23	Rodada 23	2026-08-15 00:00:00	2026-08-15 00:00:00	f	2026-04-24 17:54:22.494
e2aaeb58-0edb-43df-93ff-8f55c976b5b2	bdc291fb-5642-4e39-920c-a1f38423e3d3	24	Rodada 24	2026-08-22 00:00:00	2026-08-22 00:00:00	f	2026-04-24 17:54:22.503
934521cd-ca83-4c19-8a8f-7b562794a915	bdc291fb-5642-4e39-920c-a1f38423e3d3	25	Rodada 25	2026-08-29 00:00:00	2026-08-29 00:00:00	f	2026-04-24 17:54:22.512
8f8f77d2-fc6f-430f-841d-b3d44b9cf22b	bdc291fb-5642-4e39-920c-a1f38423e3d3	26	Rodada 26	2026-09-05 00:00:00	2026-09-05 00:00:00	f	2026-04-24 17:54:22.519
a394d871-b2a3-4c61-af6b-0a824e5a5ba2	bdc291fb-5642-4e39-920c-a1f38423e3d3	27	Rodada 27	2026-09-12 00:00:00	2026-09-12 00:00:00	f	2026-04-24 17:54:22.526
15389403-6a94-4547-a905-c19043a11e59	bdc291fb-5642-4e39-920c-a1f38423e3d3	1	Rodada 1	2026-04-05 00:00:00	2026-04-06 00:00:00	f	2026-04-06 21:59:16.483
62e53397-e201-487c-bb76-939cbd98d44e	bdc291fb-5642-4e39-920c-a1f38423e3d3	28	Rodada 28	2026-09-19 00:00:00	2026-09-19 00:00:00	f	2026-04-24 17:54:22.534
68a49b1e-e524-4497-b144-6983751e8faf	bdc291fb-5642-4e39-920c-a1f38423e3d3	3	Rodada 3 — Especial	2026-04-19 00:00:00	2026-04-21 00:00:00	f	2026-04-06 21:59:16.485
ddeaf21a-fb74-4a98-8474-efa20301a66d	bdc291fb-5642-4e39-920c-a1f38423e3d3	4	Rodada 4	2026-04-20 00:00:00	2026-04-22 23:59:59	f	2026-04-07 11:14:59.153
61cf05c8-99ca-4651-904e-00a796611ca9	bdc291fb-5642-4e39-920c-a1f38423e3d3	2	Rodada 2	2026-04-12 00:00:00	2026-04-14 00:00:00	t	2026-04-06 21:59:16.484
b0ab860a-8e72-415e-94f4-9882ab1e70bb	bdc291fb-5642-4e39-920c-a1f38423e3d3	29	Rodada 29	2026-10-07 00:00:00	2026-10-07 00:00:00	f	2026-04-24 17:54:22.545
035dc378-fe63-45fc-a7a0-4aa894b0cca6	bdc291fb-5642-4e39-920c-a1f38423e3d3	30	Rodada 30	2026-10-10 00:00:00	2026-10-10 00:00:00	f	2026-04-24 17:54:22.555
0d584f02-7d45-4bac-88fb-a43642932b23	bdc291fb-5642-4e39-920c-a1f38423e3d3	31	Rodada 31	2026-10-17 00:00:00	2026-10-17 00:00:00	f	2026-04-24 17:54:22.564
9552d0a1-03b0-4fc7-b740-7bdc998d64d0	bdc291fb-5642-4e39-920c-a1f38423e3d3	32	Rodada 32	2026-10-24 00:00:00	2026-10-24 00:00:00	f	2026-04-24 17:54:22.573
9ec3641c-d797-4cea-be7c-5cea958eca1a	bdc291fb-5642-4e39-920c-a1f38423e3d3	33	Rodada 33	2026-10-28 00:00:00	2026-10-28 00:00:00	f	2026-04-24 17:54:22.581
1c23339e-cc1b-4bc2-8af7-ec136da2b36a	bdc291fb-5642-4e39-920c-a1f38423e3d3	34	Rodada 34	2026-11-04 00:00:00	2026-11-04 00:00:00	f	2026-04-24 17:54:22.589
4e71bbe3-a714-4043-99ec-7ba94735827b	bdc291fb-5642-4e39-920c-a1f38423e3d3	35	Rodada 35	2026-11-18 00:00:00	2026-11-18 00:00:00	f	2026-04-24 17:54:22.597
426997dc-f5e5-40b0-a564-f69f6fe4994a	bdc291fb-5642-4e39-920c-a1f38423e3d3	36	Rodada 36	2026-11-21 00:00:00	2026-11-21 00:00:00	f	2026-04-24 17:54:22.605
7717d776-e9c0-4c14-9c7f-5e16e9c82eba	bdc291fb-5642-4e39-920c-a1f38423e3d3	37	Rodada 37	2026-11-28 00:00:00	2026-11-28 00:00:00	f	2026-04-24 17:54:22.611
cdb1be1e-68de-460b-9443-8d06b6c8ecff	bdc291fb-5642-4e39-920c-a1f38423e3d3	38	Rodada 38	2026-12-02 00:00:00	2026-12-02 00:00:00	f	2026-04-24 17:54:22.619
911f62b6-5eb8-4528-8c5a-dce66b43985c	bdc291fb-5642-4e39-920c-a1f38423e3d3	5	Rodada 5	2026-03-11 00:30:00	2026-03-11 00:30:00	f	2026-04-26 00:49:25.799
0568340c-0864-4385-8e79-0ee0a99b6623	bdc291fb-5642-4e39-920c-a1f38423e3d3	6	Rodada 6	2026-03-14 21:30:00	2026-03-14 21:30:00	f	2026-04-26 00:49:25.819
f61489de-6fe2-4f37-854c-5ecf524da2fe	bdc291fb-5642-4e39-920c-a1f38423e3d3	7	Rodada 7	2026-03-18 22:00:00	2026-03-18 22:00:00	f	2026-04-26 00:49:25.838
fe0f8e89-f7be-4a65-89e6-7cddd3ba67aa	bdc291fb-5642-4e39-920c-a1f38423e3d3	8	Rodada 8	2026-03-21 19:00:00	2026-03-21 19:00:00	f	2026-04-26 00:49:25.857
67eb3578-5f6b-4cf4-b848-8140e66fdea2	bdc291fb-5642-4e39-920c-a1f38423e3d3	9	Rodada 9	2026-04-01 22:30:00	2026-04-01 22:30:00	f	2026-04-26 00:49:25.878
e327d7c5-ad60-4967-af2b-b4fe2c06dd32	bdc291fb-5642-4e39-920c-a1f38423e3d3	10	Rodada 10	2026-04-04 21:30:00	2026-04-04 21:30:00	f	2026-04-26 00:49:25.908
3ef72c86-8497-4441-85fe-b508ffb0bcd1	bdc291fb-5642-4e39-920c-a1f38423e3d3	11	Rodada 11	2026-04-11 19:30:00	2026-04-11 19:30:00	f	2026-04-26 00:49:25.924
f2a710de-e1c4-4131-ac1f-8e447effdd1f	bdc291fb-5642-4e39-920c-a1f38423e3d3	12	Rodada 12	2026-04-18 21:30:00	2026-04-18 21:30:00	f	2026-04-26 00:49:25.941
\.


--
-- Data for Name: score_rules; Type: TABLE DATA; Schema: public; Owner: willianlima
--

COPY public.score_rules (id, bonus_round_multiplier, created_at, exact_score_bonus, joker_multiplier, points_for_away_goals, points_for_home_goals, points_for_outcome, pool_id, updated_at) FROM stdin;
fc208105-83bf-4707-b72f-79e2e9fec84f	2	2026-04-29 20:34:55.921	0	0	1	1	10	bf9367b3-94ed-4fdf-a107-81ac1c24fade	2026-04-30 18:10:00.48
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: willianlima
--

COPY public.users (id, name, email, password_hash, avatar_url, is_active, created_at, updated_at, favorite_team, role) FROM stdin;
8a36dcce-075f-4835-b3c4-bbf56b838a6e	Willian	admin@nagaveta.com	$2a$10$xkJ8vw3VO4FiG.nc7CZgNu3XACdo7IPK7WRd8bUQwgjsjwt..l8Mq	\N	t	2026-04-06 21:59:16.476	2026-04-20 20:29:23.21	Grêmio	ADMIN
8277529b-d97a-4cae-9a52-d3cac39cbec0	Pedro Costa	pedro@nagaveta.com	$2a$12$ztkspL26AB9AxhxhfldsWeuzkJlcBRiLYIowqnLrOjtTRXc4GxlmK	\N	t	2026-04-06 21:59:16.48	2026-04-21 16:26:14.751	Corinthians	POOL_ADMIN
08eda72e-1ac1-414d-8da4-4872e9782c53	Maria Souza	maria@nagaveta.com	$2a$12$ztkspL26AB9AxhxhfldsWeuzkJlcBRiLYIowqnLrOjtTRXc4GxlmK	\N	f	2026-04-06 21:59:16.479	2026-04-21 17:17:25.925	Palmeiras	USER
a58863b4-491b-4d1f-b35f-f8f8ad39a09d	João Silva	joao@nagaveta.com	$2a$12$ztkspL26AB9AxhxhfldsWeuzkJlcBRiLYIowqnLrOjtTRXc4GxlmK	\N	t	2026-04-06 21:59:16.478	2026-04-21 17:18:23.176	Flamengo	POOL_ADMIN
\.


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: willianlima
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: championships championships_pkey; Type: CONSTRAINT; Schema: public; Owner: willianlima
--

ALTER TABLE ONLY public.championships
    ADD CONSTRAINT championships_pkey PRIMARY KEY (id);


--
-- Name: match_result_history match_result_history_pkey; Type: CONSTRAINT; Schema: public; Owner: willianlima
--

ALTER TABLE ONLY public.match_result_history
    ADD CONSTRAINT match_result_history_pkey PRIMARY KEY (id);


--
-- Name: matches matches_pkey; Type: CONSTRAINT; Schema: public; Owner: willianlima
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: willianlima
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: pool_members pool_members_pkey; Type: CONSTRAINT; Schema: public; Owner: willianlima
--

ALTER TABLE ONLY public.pool_members
    ADD CONSTRAINT pool_members_pkey PRIMARY KEY (id);


--
-- Name: pools pools_pkey; Type: CONSTRAINT; Schema: public; Owner: willianlima
--

ALTER TABLE ONLY public.pools
    ADD CONSTRAINT pools_pkey PRIMARY KEY (id);


--
-- Name: predictions predictions_pkey; Type: CONSTRAINT; Schema: public; Owner: willianlima
--

ALTER TABLE ONLY public.predictions
    ADD CONSTRAINT predictions_pkey PRIMARY KEY (id);


--
-- Name: round_winners round_winners_pkey; Type: CONSTRAINT; Schema: public; Owner: willianlima
--

ALTER TABLE ONLY public.round_winners
    ADD CONSTRAINT round_winners_pkey PRIMARY KEY (id);


--
-- Name: rounds rounds_pkey; Type: CONSTRAINT; Schema: public; Owner: willianlima
--

ALTER TABLE ONLY public.rounds
    ADD CONSTRAINT rounds_pkey PRIMARY KEY (id);


--
-- Name: score_rules score_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: willianlima
--

ALTER TABLE ONLY public.score_rules
    ADD CONSTRAINT score_rules_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: willianlima
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: championships_slug_key; Type: INDEX; Schema: public; Owner: willianlima
--

CREATE UNIQUE INDEX championships_slug_key ON public.championships USING btree (slug);


--
-- Name: matches_external_match_id_key; Type: INDEX; Schema: public; Owner: willianlima
--

CREATE UNIQUE INDEX matches_external_match_id_key ON public.matches USING btree (external_match_id);


--
-- Name: notifications_user_id_is_read_created_at_idx; Type: INDEX; Schema: public; Owner: willianlima
--

CREATE INDEX notifications_user_id_is_read_created_at_idx ON public.notifications USING btree (user_id, is_read, created_at);


--
-- Name: pool_members_user_id_pool_id_key; Type: INDEX; Schema: public; Owner: willianlima
--

CREATE UNIQUE INDEX pool_members_user_id_pool_id_key ON public.pool_members USING btree (user_id, pool_id);


--
-- Name: pools_code_key; Type: INDEX; Schema: public; Owner: willianlima
--

CREATE UNIQUE INDEX pools_code_key ON public.pools USING btree (code);


--
-- Name: predictions_user_id_match_id_pool_id_key; Type: INDEX; Schema: public; Owner: willianlima
--

CREATE UNIQUE INDEX predictions_user_id_match_id_pool_id_key ON public.predictions USING btree (user_id, match_id, pool_id);


--
-- Name: round_winners_pool_id_round_id_user_id_key; Type: INDEX; Schema: public; Owner: willianlima
--

CREATE UNIQUE INDEX round_winners_pool_id_round_id_user_id_key ON public.round_winners USING btree (pool_id, round_id, user_id);


--
-- Name: rounds_championship_id_number_key; Type: INDEX; Schema: public; Owner: willianlima
--

CREATE UNIQUE INDEX rounds_championship_id_number_key ON public.rounds USING btree (championship_id, number);


--
-- Name: score_rules_pool_id_key; Type: INDEX; Schema: public; Owner: willianlima
--

CREATE UNIQUE INDEX score_rules_pool_id_key ON public.score_rules USING btree (pool_id);


--
-- Name: users_email_key; Type: INDEX; Schema: public; Owner: willianlima
--

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);


--
-- Name: match_result_history match_result_history_match_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: willianlima
--

ALTER TABLE ONLY public.match_result_history
    ADD CONSTRAINT match_result_history_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.matches(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: matches matches_round_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: willianlima
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_round_id_fkey FOREIGN KEY (round_id) REFERENCES public.rounds(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: notifications notifications_pool_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: willianlima
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pool_id_fkey FOREIGN KEY (pool_id) REFERENCES public.pools(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: willianlima
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: pool_members pool_members_pool_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: willianlima
--

ALTER TABLE ONLY public.pool_members
    ADD CONSTRAINT pool_members_pool_id_fkey FOREIGN KEY (pool_id) REFERENCES public.pools(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: pool_members pool_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: willianlima
--

ALTER TABLE ONLY public.pool_members
    ADD CONSTRAINT pool_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: pools pools_bonus_round_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: willianlima
--

ALTER TABLE ONLY public.pools
    ADD CONSTRAINT pools_bonus_round_id_fkey FOREIGN KEY (bonus_round_id) REFERENCES public.rounds(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: pools pools_championship_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: willianlima
--

ALTER TABLE ONLY public.pools
    ADD CONSTRAINT pools_championship_id_fkey FOREIGN KEY (championship_id) REFERENCES public.championships(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: pools pools_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: willianlima
--

ALTER TABLE ONLY public.pools
    ADD CONSTRAINT pools_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: pools pools_starting_round_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: willianlima
--

ALTER TABLE ONLY public.pools
    ADD CONSTRAINT pools_starting_round_id_fkey FOREIGN KEY (starting_round_id) REFERENCES public.rounds(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: predictions predictions_match_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: willianlima
--

ALTER TABLE ONLY public.predictions
    ADD CONSTRAINT predictions_match_id_fkey FOREIGN KEY (match_id) REFERENCES public.matches(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: predictions predictions_pool_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: willianlima
--

ALTER TABLE ONLY public.predictions
    ADD CONSTRAINT predictions_pool_id_fkey FOREIGN KEY (pool_id) REFERENCES public.pools(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: predictions predictions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: willianlima
--

ALTER TABLE ONLY public.predictions
    ADD CONSTRAINT predictions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: round_winners round_winners_pool_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: willianlima
--

ALTER TABLE ONLY public.round_winners
    ADD CONSTRAINT round_winners_pool_id_fkey FOREIGN KEY (pool_id) REFERENCES public.pools(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: round_winners round_winners_round_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: willianlima
--

ALTER TABLE ONLY public.round_winners
    ADD CONSTRAINT round_winners_round_id_fkey FOREIGN KEY (round_id) REFERENCES public.rounds(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: round_winners round_winners_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: willianlima
--

ALTER TABLE ONLY public.round_winners
    ADD CONSTRAINT round_winners_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: rounds rounds_championship_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: willianlima
--

ALTER TABLE ONLY public.rounds
    ADD CONSTRAINT rounds_championship_id_fkey FOREIGN KEY (championship_id) REFERENCES public.championships(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: score_rules score_rules_pool_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: willianlima
--

ALTER TABLE ONLY public.score_rules
    ADD CONSTRAINT score_rules_pool_id_fkey FOREIGN KEY (pool_id) REFERENCES public.pools(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

\unrestrict PodaXmsUw4p5jWtx9HY6kmWGCxb2BCup3ymtGU3l699cZYVZEaMwHo9rs5gO2ee

