# SwaraSetu: Motor Speech Assessment Suite

## Overview
SwaraSetu is a digital toolkit designed for Speech-Language Pathologists (SLPs) in India to conduct comprehensive assessments of motor speech disorders, with a focus on Dysarthria. It integrates the Frenchay Dysarthria Assessment 2.0 (FDA-2) framework along with traditional Oro-motor examinations and AI-powered analysis.

## Key Features
- **Patient Proforma**: Detailed case history and present complaint tracking.
- **Oro-Motor Examination**: Systematic evaluation of Labial, Lingual, Velar, and Laryngeal functions.
- **FDA-2 Integration**: Standardized scoring for Reflex, Respiration, Lips, Jaw, Palate, Laryngeal, Tongue, and Intelligibility.
- **DDK Rates**: Automated calculator for Alternating Motion Rates (AMR) and Sequential Motion Rates (SMR).
- **AI Speech Analysis**: Integration with Google Gemini for analyzing phonation (/a/, /i/, /u/) and speech samples for intelligibility and naturalness.
- **Subsystem Profile**: Visual representation of subsystem performance using radar/bar charts.
- **Translational Support**: Ready for integration with Sarvam AI or Bhashini for Indian language support.

## Environment Variables
- `GEMINI_API_KEY`: Required for AI-powered speech analysis.

## Setup Instructions
1. Ensure `GEMINI_API_KEY` is set in your environment.
2. The app uses the Web Audio API for recording; ensure microphone permissions are granted.
