# Recap

<p align="center">
  <h3 align="center">A modern cross-platform study companion built with React Native and Expo.</h3>

  <p align="center">
    Organize notes • Review flashcards • Track deadlines • Improve retention with spaced repetition
  </p>

  <p align="center">
    <img src="https://img.shields.io/badge/React%20Native-0.85-61DAFB?logo=react&logoColor=white" />
    <img src="https://img.shields.io/badge/Expo-SDK%2056-000020?logo=expo" />
    <img src="https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white" />
    <img src="https://img.shields.io/badge/Firebase-v12-FFCA28?logo=firebase&logoColor=black" />
  </p>
</p>

---

## Overview

Recap is a cross-platform mobile application designed to help students stay organized throughout their academic journey. It combines note-taking, flashcards powered by the **SuperMemo-2 (SM-2)** spaced repetition algorithm, deadline management, and study analytics into a single application.

Built with **React Native**, **Expo**, and **Firebase**, the project emphasizes a clean architecture, offline functionality, and a modern mobile experience.

> **Project Status:** Active Development

---

## Preview

> Screenshots will be added after the first stable release.

| Home | Notes |
|------|-------|
| ![](screenshots/home.png) | ![](screenshots/notes.png) |

| Flashcards | Analytics |
|------------|-----------|
| ![](screenshots/flashcards.png) | ![](screenshots/analytics.png) |

---

# Features

## Notes Management

- Organize notes by academic subject
- Create, edit, and delete notes
- Document attachment support
- Native file sharing
- Trash & Restore system
- Offline data persistence

---

## Flashcards & Spaced Repetition

- SuperMemo-2 (SM-2) scheduling algorithm
- Subject-based flashcard decks
- Interactive review sessions
- Difficulty ratings (0–5)
- Automatic review scheduling
- Learning retention optimization

---

## Study Planning

- Assignment & exam deadlines
- Study reminders
- Local push notifications
- Priority indicators

---

## Progress Tracking

- Mastery percentage
- Review statistics
- Due flashcards
- Study progress metrics

---

## Authentication

- Firebase Authentication
- Login & Registration
- Persistent sessions

---

## Customization

- Light Theme
- Dark Theme
- Offline-first experience

---

# Feature Checklist

## Completed

- [x] Notes Management
- [x] Subject Organization
- [x] Flashcards
- [x] SuperMemo-2 Algorithm
- [x] Firebase Authentication
- [x] Offline Storage
- [x] Local Notifications
- [x] Theme Switching
- [x] Document Attachments

## Planned

- [ ] Cloud Synchronization
- [ ] Rich Text Notes
- [ ] Markdown Support
- [ ] Widgets

---

# Tech Stack

| Category | Technologies |
|-----------|--------------|
| Mobile | React Native 0.85, Expo SDK 56 |
| Language | JavaScript |
| Authentication | Firebase Authentication |
| Storage | AsyncStorage |
| Navigation | React Navigation 7 |
| Notifications | Expo Notifications |
| File Handling | Expo File System, Expo Document Picker, Expo Sharing |
| UI | React Native Reanimated, Expo Linear Gradient, Expo Vector Icons |

---

# Project Structure

```text
recap/
│
├── App.js
├── app.json
├── eas.json
├── index.js
├── package.json
├── README.md
├── LICENSE
│
└── src/
    ├── api/
    ├── assets/
    ├── context/
    ├── data/
    ├── navigation/
    ├── screens/
    ├── services/
    ├── storage/
    └── utils/
```

---

# Architecture

The application follows a modular architecture that separates presentation, navigation, business logic, persistence, and services.

```text
UI
│
├── Screens
├── Components
│
▼
Navigation
│
▼
React Context
│
├── Firebase Authentication
├── Async