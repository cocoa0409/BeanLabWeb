---
slug: deepswe
title: "DeepSWE-oriented Dataset"
category: "Coding"
---

We present an expert-curated and manually validated dataset of challenging repository-level software engineering tasks, designed to train and evaluate coding agents in realistic, long-horizon implementation and verification settings. Each task pairs a concise requirement with an executable F2P/P2P verifier, an isolated environment, supporting rejection sampling–based SFT, reinforcement learning, and rigorous agent evaluation.  

---


## Core Design Philosophy

### 1\. Expanding High-Quality Repository Coverage from the DeepSWE Domain Landscape

Building on DeepSWE's domain coverage, we further expand into cloud-native infrastructure, databases, AI/ML, data engineering, frontend development, developer tools, observability, security, Web3, and infrastructure as code. Repositories are selected based on GitHub Stars, PR activity, recency of development, and contributor base. The median repository has approximately **1,580 Stars**; **81.7%** had commits within 30 days before sampling, and **92.8%** within 90 days. The dataset covers Go, TypeScript, Python, JavaScript, Rust, and Java, with **Go representing the largest share at approximately 39%**.

### 2\. High-Value PR Selection

We use GitHub Archive data and heuristic retrieval to identify real **New Feature** and **Bug Fix** PRs, then rank them using:

- production and test patch size;  
- number of files touched and PR recency;  
- quality of the requirement description and added tests.

Selected PRs touch an average of **9.5 files and 610 changed lines**. At P90, they reach **15 files and 1,020 changed lines**.

### 3\. Expert-in-the-Loop QA: Complete, Implementation-Agnostic Verifiers

Each candidate task receives at least **8 frontier-model rollouts**, using a model pool that includes Claude Opus 5, GPT-5.6 Sol, Kimi K3, and Qwen 3.8 Max. Software experts review every failed trajectory and address two primary verifier issues:

- **Insufficient coverage:** F2P/P2P coverage is added or strengthened for **43%** of retained tasks.  
- **Verifier overclaim:** implementation-specific F2P constraints are corrected for **52%** of retained tasks.

Only **69%** of candidate tasks pass the full QA pipeline, and **76%** of retained tasks receive manual revisions. Every task uses a pinned base commit with isolated agent and verifier environments.

## Performance

### Strong Gains from Lightweight SFT

We use Kimi K3 rejection sampling to construct approximately **600 high-quality trajectories** from the DeepSWE-like dataset, then perform lightweight SFT on an internal build of Nemotron 3 Nano. On the DeepSWE evaluation set:

- F2P Pass Rate improves from **25.1% to 43.9%**—an increase of 18.8 percentage points, or 74.9% relative.  
- P2P Pass Rate improves from **88.2% to 90.0%**.

The results show substantial gains in task-solving capability while preserving regression stability.

## Task Profile: Concise Specifications, Long-Horizon Implementations

Each task follows the Harbor format, with a natural-language instruction, a reproducible containerized environment, a reference solution, and an isolated F2P/P2P test suite.

The evaluation stack is aligned with DeepSWE v1.1, using Harbor-compatible task packaging, Pier orchestration, mini-swe-agent, and isolated F2P/P2P verification.

- Instruction: **635 tokens** on average using the `o200k_base` tokenizer.  
- Reference solution: **6.5 files and 334 changed lines** on average.  
- Test/verifier patch: **3 test files and 276 changed lines** on average.  
- Verifier: **12.1 F2P and 235 P2P test nodes** on average.

Using **Qwen-3.8-Max** as the agent model with at least eight independent rollouts per task, the evaluation and trajectory statistics are:

- **Pass@1:** 65.9%  
- **Pass@8:** 85.0%  
- **Average trajectory length:** 86.0 steps  
- **P90 trajectory length:** 135 steps


---


## Sample

Please [contact us](mailto:contact@thebeanos.com?subject=DeepSWE-oriented%20Dataset%20%E2%80%94%20Samples).
