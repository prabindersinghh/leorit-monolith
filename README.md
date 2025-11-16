Leorit.ai — Monolith Repository
AI-powered, sample-first manufacturing workflow for bulk apparel

This repository contains the monolithic codebase for Leorit.ai, a B2B platform that centralizes custom apparel manufacturing with:

AI-generated product mockups

CSV parsing, validation & correction

3D interactive design previews

Role-based dashboards for buyers & manufacturers

Sample-first order workflow

QC (video/image) review & approval

Supabase authentication with RLS security

Edge functions for server-side logic

Project Structure:

This monolithic repo includes:

Frontend

React.js

Tailwind CSS

3D model rendering (basic interactive viewer)

Buyer dashboard

Manufacturer dashboard

Design editor (repositioning, layering, personalization)

Backend / API

FastAPI (Python) for business logic

Node.js (TypeScript) for mockup generation + utilities

Groq API for reasoning flows

Stable Diffusion for mockup generation

CSV parsing & AI-based correction pipeline

QC video validation endpoints

Authentication & Security

Supabase auth

Role-based access (buyer / manufacturer / admin)

RLS policies for DB tables

Server-side input validation

JWT-protected edge functions

Key Features:
AI + Design Workflow

Upload front/back design files
Auto-generate mockups (basic SD integration)
3D preview of garment
Upload CSV → AI auto-corrects errors
Personalization module (names, positions, colors, rotation)
Sample-First Manufacturing Flow
Buyer requests sample → manufacturer receives request
Manufacturer uploads QC video (approve / reject / raise concern)
Flow prepared for escrow milestone logic
Manufacturer Tools
Dashboard for incoming orders
QC uploads

Status updates

Current Development Status

This repo currently powers:

 Working design upload
 Working 3D preview (basic)
 Basic AI mockup generation
 CSV upload + AI correction
 Personalization panel with live preview
 QC workflow (video upload + review options)
 Role-based dashboard access
 Supabase auth + RLS
 Edge function validation logic

Upcoming:
Full escrow milestone flow
More advanced mockup generation
Production-ready manufacturer onboarding

Running the Project Locally
Clone:
git clone https://github.com/prabindersinghh/leorit-monolith.git
cd leorit-monolith

Install Dependencies:

(If using monorepo layout: adjust commands accordingly)

npm install
pip install -r requirements.txt

Setup Environment:

Create .env file(s) with:

SUPABASE_URL=
SUPABASE_ANON_KEY=
OPENAI_API_KEY=
GROQ_API_KEY=
STABILITY_API_KEY=

Start Dev Servers

Frontend
npm run dev

Backend (FastAPI)
uvicorn api.main:app --reload

Author
Prabinder Singh
Founder, Leorit.ai
Email: prabindersinghh@gmail.com

Purpose of Repo
This repository is the core monolithic build used for early YC-facing MVP development, pilot testing with Leorit India, and rapid shipping of new features.
It is continuously updated as part of the MVP → pilot → scalable platform roadmap.

License
Private — All rights reserved.
