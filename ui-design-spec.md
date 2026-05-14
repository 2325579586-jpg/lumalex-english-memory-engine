# Word Memory Web App UI Design Spec

## Product Positioning

This is a web-based English vocabulary learning product for university students, graduate exam learners, and general English learners. The product centers on a calm, immersive study atmosphere rather than a rigid task-management experience.

The overall concept is:

**A warm, immersive memory space**

Core personality:

- Focused but not oppressive
- Minimal but not cold
- Premium but not business-like
- Encouraging rather than game-heavy

## 1. Visual Direction

### 1.1 Design Keywords

- Immersive background photography
- Warm orange and soft violet glow
- Frosted glass cards
- Dark translucent overlays
- Large English headlines
- White typography
- Clear memory feedback
- Quiet, student-friendly atmosphere

### 1.2 Art Direction

Use full-screen high-definition background images with calm learning moods:

- Early morning campus light
- Window-side desk shadows
- Evening sky with city lights
- Soft fog landscape
- Warm sunset clouds

Background behavior:

- Cover the full viewport
- Add a dark overlay for readability
- Add soft gradient light spots in orange and violet
- Keep content area breathable with generous spacing

### 1.3 Color System

Primary palette:

- `Accent Orange`: `#FF9A4D`
- `Accent Orange Deep`: `#E97B2E`
- `Soft Violet`: `#8F84FF`
- `Soft Violet Mist`: `#B8B1FF`
- `Deep Gray`: `#11151C`
- `Panel Dark`: `#1A202A`
- `Text White`: `#F7F8FA`
- `Text Secondary`: `#C9CFD8`
- `Line Soft`: `rgba(255,255,255,0.12)`
- `Glass Fill`: `rgba(255,255,255,0.10)`
- `Glass Strong`: `rgba(255,255,255,0.16)`

Semantic colors:

- `Success`: `#72D39B`
- `Warning`: `#FFB257`
- `Danger`: `#FF7B7B`
- `Info`: `#7BB8FF`

Recommended gradients:

- Primary glow: `linear-gradient(135deg, rgba(255,154,77,0.85), rgba(143,132,255,0.72))`
- Hero overlay: `linear-gradient(180deg, rgba(8,10,14,0.16), rgba(8,10,14,0.58))`
- Button highlight: `linear-gradient(135deg, #FFB06B, #FF8F3F)`

### 1.4 Typography

Recommended font pairing:

- English display: `Fraunces`, `Cormorant Garamond`, serif
- Chinese / UI text: `MiSans`, `Source Han Sans SC`, sans-serif
- Numeric data: `Manrope`

Type scale:

- Display XL: `48/56`
- Display L: `36/44`
- H1: `28/36`
- H2: `22/30`
- Body L: `16/26`
- Body M: `14/22`
- Caption: `12/18`

Usage rules:

- Large English titles should remain light and airy
- Chinese supporting copy should stay short and low-contrast
- Avoid dense blocks of text

### 1.5 Surfaces and Effects

Glass card style:

- Background: `rgba(255,255,255,0.10)`
- Border: `1px solid rgba(255,255,255,0.14)`
- Blur: `backdrop-filter: blur(20px)`
- Shadow: `0 20px 60px rgba(0,0,0,0.22)`
- Radius: `24px`

Secondary card:

- Background: `rgba(17,21,28,0.42)`
- Border: `1px solid rgba(255,255,255,0.10)`
- Radius: `20px`

Hover behavior:

- Slight upward movement `translateY(-2px)`
- Slight increase in glass brightness
- Orange glow for primary actions only

## 2. Information Architecture

Primary navigation:

- Home
- Learn
- Review
- Lexicons
- Stats
- Settings

Global quick action:

- Add Word

Recommended navigation pattern:

- Mobile: fixed bottom glass navigation bar
- Desktop: left floating vertical glass navigation rail

Key user journeys:

1. Open app -> see today’s tasks -> enter Learn or Review
2. Add a word -> assign lexicon -> generate AI pronunciation -> save
3. Review card -> choose Know / Vague / Don’t Know -> system reschedules
4. Open Stats -> confirm streak and retention progress

## 3. Layout Principles

### 3.1 Grid

Desktop:

- Content width: `1200px` max
- 12-column grid
- Gutter: `24px`
- Outer margin: `32px`

Tablet:

- 8-column grid
- Gutter: `20px`
- Outer margin: `20px`

Mobile:

- 4-column grid
- Gutter: `12px`
- Outer margin: `16px`

### 3.2 Spacing

Base spacing unit: `8px`

Recommended spacing tokens:

- `xs`: `8px`
- `sm`: `12px`
- `md`: `16px`
- `lg`: `24px`
- `xl`: `32px`
- `2xl`: `40px`
- `3xl`: `56px`

### 3.3 Responsive Rules

Mobile-first behavior:

- Prioritize one primary task per screen
- Keep main actions fixed within thumb reach
- Collapse secondary stats into swipeable cards
- Convert desktop multi-column sections into vertical stacks

Breakpoints:

- `0-767px`: mobile
- `768-1023px`: tablet
- `1024px+`: desktop

Responsive behavior examples:

- Home hero becomes stacked on mobile
- Learn and Review cards sit side-by-side only on tablet and desktop
- Stats charts become swipeable modules on small screens
- Settings uses grouped accordions on mobile and split panels on desktop

## 4. Page Specifications

## 4.1 Home / Dashboard

### Goal

Give users a calm overview of today’s study rhythm and push them into either Learn or Review with minimal friction.

### Layout

1. Top bar
2. Hero summary card
3. Learn / Review dual-entry cards
4. Today progress strip
5. Lexicon shortcuts
6. Recent memory feedback
7. Navigation

### Modules

#### Top Bar

Content:

- Greeting
- Date
- Streak indicator
- Avatar / account entry

Function:

- Establish personal warmth and daily continuity

Suggested copy:

- `Good evening`
- `Day 12 streak`

#### Hero Summary Card

Content:

- Large title: `Learn with Calm.`
- Supporting line
- Today’s learning target
- Completion ring or progress bar

Function:

- Sets emotional tone
- Gives immediate orientation

Suggested copy:

- `Start small. Remember deeply.`
- `12 new words · 28 reviews today`

#### Learn / Review Entry Cards

Content:

- Large label
- Short supporting text
- Task count
- Mini icon

Function:

- Primary CTA area

Behavior:

- Whole card clickable
- Strongest emphasis in interface

Suggested copy:

- `Learn`
- `Meet today’s new words`
- `Review`
- `Strengthen what you’ve seen`

#### Today Progress Strip

Content:

- New words completed
- Reviews completed
- Estimated remaining time
- Daily completion percentage

Function:

- Reinforce progress and closure

#### Lexicon Shortcuts

Content:

- Current active lexicon
- Other lexicons
- Word counts and due counts

Function:

- Encourage goal-based study

#### Recent Memory Feedback

Content:

- Recently mastered words
- Upcoming difficult reviews

Function:

- Make memory feedback visible, not abstract

## 4.2 Learn Page

### Goal

Present new vocabulary in a focused, readable format and encourage first-time encoding.

### Layout

1. Focus header
2. Main word card
3. Detail modules
4. Action zone
5. Mini progress footer

### Modules

#### Focus Header

Content:

- Lexicon name
- Progress count
- Exit

Function:

- Remind the user what set they are learning

#### Main Word Card

Content:

- Word or phrase
- IPA
- Pronunciation button
- Accent language switch if needed

Function:

- Core visual focus

Visual rule:

- Keep the word large and centered
- Do not overload the first view

#### Detail Modules

Content:

- Part of speech
- Meaning
- Example sentence
- Mnemonic
- Usage notes

Function:

- Provide layered understanding

Interaction:

- Default collapsed on mobile except meaning
- Expand smoothly with fade and slide

#### Action Zone

Buttons:

- `I got it`
- `Review later`
- `One more look`

Function:

- Bridge new learning into the next memory step

#### Mini Progress Footer

Content:

- Current position
- Remaining cards
- Subtle encouragement

Suggested copy:

- `4 of 12`
- `You’re building today’s memory set`

## 4.3 Review Page

### Goal

Provide clear memory testing and immediate spaced-repetition feedback.

### Layout

1. Review status header
2. Review flashcard
3. Reveal answer action
4. Mastery buttons
5. Reschedule feedback

### Modules

#### Review Status Header

Content:

- Remaining reviews
- Current index
- Estimated time left

#### Review Flashcard

Front side:

- Word or phrase only

Back side:

- IPA
- Meaning
- Part of speech
- Example
- Mnemonic

Interaction:

- Tap to reveal
- Smooth card lift / fade transition

#### Mastery Buttons

Buttons:

- `Know`
- `Vague`
- `Don’t Know`

Color behavior:

- Know: green-tinted neutral
- Vague: orange
- Don’t Know: red-soft

Function:

- Main input for algorithm scheduling

#### Reschedule Feedback

Immediate message after choice:

- `Next review: tomorrow`
- `Next review: in 3 days`
- `See this again in 10 minutes`

Function:

- Makes the forgetting-curve logic emotionally understandable

#### Empty State Modal

Trigger:

- No reviews due today

Content:

- Quiet celebratory message
- CTA to learn new words

Suggested copy:

- `No words to review today.`
- `You’re all caught up.`
- `Learn something new`

## 4.4 Add Word / Phrase Page

### Goal

Make adding content feel light, intelligent, and efficient.

### Layout

1. Page title
2. Input form card
3. AI assist block
4. Live preview card
5. Save action bar

### Modules

#### Input Form Card

Fields:

- Word / phrase
- IPA
- Part of speech
- Meaning
- Example sentence
- Mnemonic
- Tags
- Lexicon selector

Function:

- Structured but not intimidating input

#### AI Assist Block

Actions:

- Generate pronunciation
- Suggest IPA
- Complete example sentence
- Generate mnemonic

Function:

- Reduce manual effort

#### Live Preview Card

Content:

- Real-time display of how this item will look in Learn / Review

Function:

- Helps users trust the result before saving

#### Save Action Bar

Buttons:

- `Save`
- `Save and Add Another`

Interaction:

- Sticky at bottom on mobile

## 4.5 Lexicon Management Page

### Goal

Support custom study goals such as exam prep and phrase collections.

### Layout

1. Header and create button
2. Lexicon card grid
3. Lexicon detail drawer
4. Bulk actions

### Modules

#### Lexicon Card

Content:

- Name
- Cover style / gradient
- Total words
- Due today
- Mastery rate

Function:

- Make each lexicon feel like a themed learning space, not a folder

Examples:

- `Graduate Exam`
- `IELTS Phrases`
- `CET-6 High Frequency`

#### Create Lexicon Entry

Content:

- Name
- Goal type
- Daily target
- Cover mood

Function:

- Allow quick customization

#### Lexicon Detail Drawer

Content:

- Recent activity
- Study target
- Word list management
- Import / export

## 4.6 Learning Stats Page

### Goal

Show improvement, consistency, and retention without looking like a dry analytics dashboard.

### Layout

1. Time-range switcher
2. Core metric cards
3. Streak heatmap
4. Retention and mastery charts
5. Lexicon comparison
6. Encouragement block

### Modules

#### Time-Range Switcher

Options:

- Today
- This Week
- This Month

#### Core Metric Cards

Metrics:

- New words learned
- Reviews completed
- Retention rate
- Current streak

#### Streak Heatmap

Function:

- Gives a visible sense of habit continuity

#### Mastery Distribution

States:

- Know
- Vague
- Don’t Know

Function:

- Show memory quality, not only quantity

#### Lexicon Comparison

Function:

- Help users see which learning goals are advancing

#### Encouragement Block

Suggested copy:

- `Your memory rhythm is getting stronger.`
- `You reviewed 28 words today.`

## 4.7 Settings Page

### Goal

Provide control over learning pace, voice, and atmosphere without feeling technical.

### Layout

1. Learning preferences
2. Review preferences
3. Pronunciation settings
4. Appearance settings
5. Account and data

### Modules

#### Learning Preferences

Items:

- Daily new word target
- Session size
- Default lexicon

#### Review Preferences

Items:

- Daily review cap
- Review style
- Spaced repetition intensity

#### Pronunciation Settings

Items:

- AI voice
- Accent
- Auto-play toggle
- Speech rate

#### Appearance Settings

Items:

- Background theme
- Blur intensity
- Motion on/off
- Font scale

#### Account and Data

Items:

- Sync status
- Export data
- Backup
- Sign out

## 5. Component Design Rules

## 5.1 Buttons

Primary button:

- Warm orange gradient fill
- White text
- Height `48px`
- Radius `16px`
- Shadow with soft orange glow

Secondary button:

- Glass surface
- White text
- Light border

Tertiary text button:

- No fill
- Secondary white text
- Orange hover

Special mastery buttons:

- Large horizontal pills
- Distinct semantic tint
- Equal width
- Positioned at bottom within thumb zone

## 5.2 Cards

Card variants:

- Hero glass card
- Standard info card
- Compact stat card
- Flashcard
- Modal card

Rules:

- Keep content sparse
- One focal action per card
- Use top-left alignment except flashcards, which should center the word

## 5.3 Inputs

Style:

- Frosted dark field
- White text
- Placeholder in soft gray
- Height `48px`
- Textarea radius `18px`

States:

- Default
- Focus with orange glow ring
- Error with soft red edge
- Success with green hint

## 5.4 Tags and Badges

Tag uses:

- POS labels
- Lexicon labels
- Difficulty badges
- Status indicators

Style:

- Small rounded pills
- Translucent background
- White text or orange accent text

## 5.5 Progress Indicators

Variants:

- Linear progress bar
- Circular progress ring
- Heatmap blocks

Style:

- Thin and elegant
- Avoid overly saturated colors

## 5.6 Icons

Recommended style:

- Rounded line icons
- Thin to medium stroke
- Minimal fill usage

Suggested icon set semantics:

- Home
- Book
- Repeat
- Plus
- Chart
- Settings
- Speaker
- Flame
- Clock
- Check

## 5.7 Modals and Feedback

Modal style:

- Frosted glass dialog
- Soft entrance animation
- Background blur and dimming

Use cases:

- No review due
- Save success
- Delete confirm
- Daily completion

Tone:

- Calm and supportive
- Never harsh or overly gamified

## 6. Key Interaction Patterns

### 6.1 Learn to Review Flow

1. User opens Learn
2. Reads word
3. Taps pronunciation
4. Expands meaning and mnemonic
5. Marks `I got it` or `Review later`
6. Item is scheduled into spaced repetition

### 6.2 Review Decision Feedback

After each review judgment:

- Immediate visual confirmation
- Next review time displayed
- Card transitions smoothly to the next one

Micro-feedback examples:

- Soft orange glow for `Vague`
- Green pulse for `Know`
- Red-soft shake for `Don’t Know`

### 6.3 Empty State Handling

When no reviews are due:

- Use a modal or inline state card
- Offer a single next step
- Keep tone reassuring

### 6.4 Add Word Assistance

When entering a new word:

- Suggest existing data automatically
- Keep AI buttons optional
- Preserve manual edit control

## 7. Motion Guidelines

Motion should feel gentle and intentional.

Recommended animation set:

- Page fade-in with slight upward drift
- Card hover lift
- Flashcard reveal fade
- Progress bar smooth fill
- Modal blur-in

Durations:

- Fast: `160ms`
- Standard: `240ms`
- Emphasis: `320ms`

Easing:

- `cubic-bezier(0.22, 1, 0.36, 1)`

Reduce-motion mode:

- Remove scale and float
- Keep opacity transitions only

## 8. UI Copy Suggestions

## 8.1 Home

- `Learn with Calm.`
- `Start small. Remember deeply.`
- `Today’s Learning`
- `Ready for Review`
- `You’re building a stronger memory rhythm.`

## 8.2 Learn

- `New Word`
- `Listen`
- `Mnemonic`
- `One more look`
- `Save for review`

## 8.3 Review

- `Tap to Reveal`
- `Know`
- `Vague`
- `Don’t Know`
- `Next review: tomorrow`

## 8.4 Add Word

- `Add New Memory`
- `Generate Pronunciation`
- `Complete Example`
- `Save and Add Another`

## 8.5 Lexicons

- `My Lexicons`
- `Create a New Set`
- `Choose your study goal`

## 8.6 Stats

- `Your Memory Rhythm`
- `Keep the streak alive`
- `Retention is improving`

## 8.7 Empty / Modal States

- `No words to review today.`
- `You’re all caught up.`
- `Take a breath, or learn something new.`
- `Nice work today.`

## 9. Mobile-First Recommendations

- Keep the main CTA in the lower half of the screen
- Use sticky bottom action bars for Learn, Review, and Add Word
- Limit the first visible screen to one main objective
- Keep navigation icons large and evenly spaced
- Use horizontal carousels for secondary data instead of dense tables
- Avoid more than one modal layer

## 10. Design Delivery Recommendations

For the next production step, the UI can be organized into:

1. Design tokens
2. Layout templates
3. Core components
4. Page prototypes
5. Motion specs

Recommended first prototype priority:

1. Home
2. Learn
3. Review
4. Add Word

These four screens define the product feeling most clearly and can anchor the rest of the interface system.
