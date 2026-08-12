/* =============================================================================
   GuestGuard Inspector Training — QUIZ CONTENT
   =============================================================================
   This is the ONLY file you normally need to edit to change quiz questions.

   Structure:
     GG_QUIZZES[moduleId][chapterNumber] = { passingScore, questions: [...] }

       moduleId       "module1", "module2", ... (matches the page that loads it)
       chapterNumber  1, 2, 3 ...  (matches "ch=N" / the chapter in that module)

   Each question object:
     {
       text:        "The question shown to the learner",
       options:     ["Option A", "Option B", "Option C"],   // 2 to 4 options
       correct:     1,            // INDEX of the right option (0 = A, 1 = B, ...)
       explanation: "Shown after submitting — why the answer is what it is."
     }

   Notes
   -----
   • "correct" is a zero-based index, NOT the letter. A=0, B=1, C=2, D=3.
   • You can have 2, 3, or 4 options — the quiz renders whatever you provide.
   • "passingScore" is a percent (0–100). To make a quiz informational instead
     of a hard gate, set its passingScore to 0 (everyone "passes"), or flip the
     global gate flag in the module page (see GG_QUIZ_REQUIRE_PASS there).
   • To add a quiz for a new chapter, just add a new "chapterNumber: { ... }".
============================================================================= */

window.GG_QUIZZES = {

  /* ───────────────────────────── MODULE 1 ───────────────────────────── */
  module1: {

    /* Chapter 1 — Welcome & Company (PDF: "Who GuestGuard Is & Your Role") */
    1: {
      passingScore: 75,
      questions: [
        {
          text: "How would you best describe GuestGuard's core mission?",
          options: [
            "A booking platform that lists vacation rentals",
            "A third-party auditing system for vacation rental quality and consistency",
            "A property management company for hosts"
          ],
          correct: 1,
          explanation: "GuestGuard is a third-party auditing system focused on the quality and consistency of vacation rentals — not a booking site or a property manager."
        },
        {
          text: "What's the main difference between a GuestGuard inspection and a traditional home inspection?",
          options: [
            "GuestGuard inspections are longer and more technical",
            "Traditional inspections focus on structural/mechanical condition for a buyer; GuestGuard focuses on the guest experience",
            "There's no real difference — same checklist, different name"
          ],
          correct: 1,
          explanation: "A traditional inspection assesses structural and mechanical condition for a buyer. GuestGuard evaluates the guest experience — safety, comfort, accessibility, cleanliness, and amenities."
        },
        {
          text: "What does earning a GuestGuard certification give a host?",
          options: [
            "A marketing asset plus actionable feedback on what to fix",
            "A guaranteed higher nightly rate",
            "Legal liability protection"
          ],
          correct: 0,
          explanation: "Certification gives hosts a marketing asset that signals a safe, well-maintained property, plus actionable feedback on what to improve — not a rate guarantee or legal protection."
        },
        {
          text: "What problem does GuestGuard exist to solve?",
          options: [
            "Hosts charging too much for rentals",
            "Short-term rentals historically had no standardized safety/quality inspection — guests just took the host's word",
            "A shortage of licensed home inspectors"
          ],
          correct: 1,
          explanation: "Unlike hotels, short-term rentals have lacked a standardized safety and quality inspection, leaving guests to rely on the host's claims. GuestGuard fills that gap."
        }
      ]
    },

    /* Chapter 2 — Inspection Rubric (PDF: "The Inspection Framework") */
    2: {
      passingScore: 75,
      questions: [
        {
          text: "The rubric has 169 questions across 12 sections. Why doesn't that overwhelm you in practice?",
          options: [
            "You only answer a random sample each time",
            "Many questions are conditional and only appear when relevant to the property",
            "A second inspector splits the list with you"
          ],
          correct: 1,
          explanation: "Many questions are conditional. If a property has no pool, for example, the entire pool section is skipped automatically, so you only see what's relevant."
        },
        {
          text: "What single consideration does the entire inspection connect back to?",
          options: [
            "Whether a guest would feel comfortable and well taken care of",
            "Whether the property would pass a building code review",
            "Whether the host is easy to work with"
          ],
          correct: 0,
          explanation: "Every item ties back to one question: would a guest feel comfortable and well taken care of in this space?"
        },
        {
          text: "How are amenities like Wi-Fi, bathrobes, and snacks treated compared to safety checks?",
          options: [
            "Exactly the same — all are hard pass/fail",
            "They're important to guests and how the property is represented, but not strictly pass/fail the way safety items are",
            "They're ignored unless the host requests them"
          ],
          correct: 1,
          explanation: "Amenities matter to guests and to how the property is represented, but they aren't strict pass/fail items the way safety checks are."
        },
        {
          text: "When you find a hazard like mold, exposed wiring, or pests, what is your role?",
          options: [
            "Repair it on the spot if it's minor",
            "Document it clearly and accurately so the host knows what to address",
            "Decide whether the property should be delisted"
          ],
          correct: 1,
          explanation: "Your job is to document hazards clearly and accurately. You don't repair them yourself or decide whether the property is delisted."
        }
      ]
    },

    /* Chapter 3 — Workflow & Platform (PDF: "How Inspections Work, Jobs & Getting Paid") */
    3: {
      passingScore: 75,
      questions: [
        {
          text: "What device does GuestGuard recommend for inspections, and why?",
          options: [
            "An iPad or tablet — the cleanest, most compact view for going room by room",
            "A laptop, because you'll type long reports",
            "A dedicated GuestGuard scanner device"
          ],
          correct: 0,
          explanation: "A tablet/iPad gives the cleanest, most compact room-by-room view. A phone or computer works too, but the tablet view is recommended."
        },
        {
          text: "What are the three stages a job moves through?",
          options: [
            "Open → reviewed → closed",
            "Unassigned → assigned → accepted",
            "Requested → scheduled → invoiced"
          ],
          correct: 1,
          explanation: "Jobs move through unassigned, assigned, and accepted stages."
        },
        {
          text: "You mark an item \u201cno\u201d because something required is missing. What happens next?",
          options: [
            "A red pop-up appears asking for a short description, and it becomes a remediation task the host must fix (with photo evidence, signed off by corporate) before getting credit",
            "The property automatically fails the whole inspection",
            "You email the host directly to arrange a fix"
          ],
          correct: 0,
          explanation: "A red pop-up asks for a short description, creating a remediation task. The host fixes it and submits photo evidence, and corporate signs off before credit is awarded."
        },
        {
          text: "About how long should a proper inspection take, and what timing would raise a flag?",
          options: [
            "One to two hours; finishing in ~5\u201310 minutes signals it wasn't done properly (and 5\u20136 hours triggers a follow-up)",
            "Under 30 minutes; anything longer means you're too slow",
            "A full day; rushing is always penalized"
          ],
          correct: 0,
          explanation: "A proper inspection runs about one to two hours. Finishing in ~5\u201310 minutes suggests it wasn't done properly, and 5\u20136 hours may trigger a follow-up."
        }
      ]
    }
  },

  /* ───────────────────────────── MODULE 2 ───────────────────────────── */
  module2: {

    /* Chapter 1 — Intro & Outside (PDF: "Introduction & Exterior") */
    1: {
      passingScore: 75,
      questions: [
        {
          text: "For parking, what's the minimum clearance required on each side of a parked car, and who is it primarily for?",
          options: [
            "18 inches, for loading luggage",
            "24 inches, for wheelchair users",
            "30 inches, for any guest"
          ],
          correct: 1,
          explanation: "Each side of a parked car needs at least 24 inches of clearance for wheelchair users, paired with the rule that parking be within 30 feet of the front door."
        },
        {
          text: "Why does the rubric have you flag overgrown shrubbery near the property?",
          options: [
            "Purely curb appeal",
            "Overgrowth can give intruders cover",
            "It blocks GFCI outlets"
          ],
          correct: 1,
          explanation: "Overgrown shrubbery is a security item, not just aesthetics — it can give intruders cover."
        },
        {
          text: "A pool's gate has a simple latch but no keyed lock. Does it satisfy the \u201cdoes the gate lock\u201d check?",
          options: [
            "Yes — even a latch counts",
            "No, it must be keyed"
          ],
          correct: 0,
          explanation: "A simple latch satisfies the check — it doesn't have to be a keyed lock."
        },
        {
          text: "When a hot tub is not in use, the cover being on is specifically about what?",
          options: [
            "Heat retention / energy",
            "Child and pet safety"
          ],
          correct: 1,
          explanation: "The cover requirement is a child and pet safety measure, not about heat retention."
        }
      ]
    },

    /* Chapter 2 — Basement & Kitchen (PDF: "Basement/Maintenance Room & Kitchen") */
    2: {
      passingScore: 75,
      questions: [
        {
          text: "Which wiring setup passes the standard check (applied in every room)?",
          options: [
            "Daisy-chained extension cords",
            "Power strips with surge protectors only",
            "Any power strip is fine"
          ],
          correct: 1,
          explanation: "Only power strips with surge protectors pass. Daisy-chained cords fail, and not every power strip qualifies. This check is applied in every room."
        },
        {
          text: "Why does the kitchen get more extensive fire-safety checks than other rooms?",
          options: [
            "It's the highest fire-risk room in the house",
            "It has the most outlets",
            "It's always guest-accessible"
          ],
          correct: 0,
          explanation: "The kitchen is the highest fire-risk room, so it receives more extensive fire-safety checks."
        },
        {
          text: "A fire extinguisher labeled \u201cABC rated\u201d means it is:",
          options: [
            "Rated for outdoor use only",
            "Effective against all common household fire types",
            "Three years old or newer"
          ],
          correct: 1,
          explanation: "An ABC rating means the extinguisher is effective against all common household fire types."
        },
        {
          text: "You find no flammable materials in the maintenance room. How do you mark that item?",
          options: [
            "Fail",
            "Not applicable (N/A)",
            "Leave it blank"
          ],
          correct: 1,
          explanation: "With no flammable materials present, the item is marked Not Applicable (N/A) — never left blank."
        }
      ]
    },

    /* Chapter 3 — Bathroom & Hallway (PDF: "Bathroom & Hallway") */
    3: {
      passingScore: 75,
      questions: [
        {
          text: "Is the bathroom accessibility assessment required on every inspection?",
          options: [
            "Yes, always",
            "No — only when the property is marked accessibility-friendly, which you'll know beforehand"
          ],
          correct: 1,
          explanation: "The accessibility assessment is only required when the property is marked accessibility-friendly, which you'll know ahead of time."
        },
        {
          text: "For a battery-powered fire alarm, what does the inspector do?",
          options: [
            "Collect a certificate from the alarm company",
            "Test it yourself and upload a video under 10 seconds capturing the sound"
          ],
          correct: 1,
          explanation: "For a battery-powered alarm, you test it yourself and upload a sub-10-second video capturing the sound. The certificate route is for monitored/local systems."
        },
        {
          text: "How is the bathroom door width measured?",
          options: [
            "From the inside of the frame, with the door open",
            "Outside edge to outside edge, door closed"
          ],
          correct: 0,
          explanation: "Door width is measured from the inside of the frame with the door open."
        },
        {
          text: "A shower is not a roll-in shower. What do you record instead?",
          options: [
            "Nothing — mark N/A",
            "The threshold height and the shower's square footage"
          ],
          correct: 1,
          explanation: "If it isn't a roll-in shower, you still record the threshold height and the shower's square footage."
        }
      ]
    },

    /* Chapter 4 — Bedroom (PDF: "Bedroom") */
    4: {
      passingScore: 75,
      questions: [
        {
          text: "When do you mark the escape-ladder item N/A?",
          options: [
            "Ground-floor rooms or apartment buildings",
            "Any room with two windows",
            "Never — it's always required"
          ],
          correct: 0,
          explanation: "The escape-ladder item is N/A for ground-floor rooms or apartment buildings."
        },
        {
          text: "A bed measures under 24 inches from floor to mattress top. What do you ask about?",
          options: [
            "A Hoyer lift",
            "Bed raisers (GuestGuard sells them)"
          ],
          correct: 1,
          explanation: "If a bed is under 24 inches from floor to mattress top, you ask about bed raisers, which GuestGuard sells."
        },
        {
          text: "After inspecting the sheets, blankets, and mattress for bed bugs, what must you do?",
          options: [
            "Remake the bed",
            "Strip the bed for the host",
            "Photograph the mattress tag"
          ],
          correct: 0,
          explanation: "After checking for bed bugs, you remake the bed."
        },
        {
          text: "When is the air-conditioning item marked N/A?",
          options: [
            "When the climate doesn't require air conditioning",
            "When there's a ceiling fan",
            "Never"
          ],
          correct: 0,
          explanation: "Air conditioning is marked N/A when the climate doesn't require it."
        }
      ]
    },

    /* Chapter 5 — Common Room & Overall (PDF: "Common Room, Overall & Wrap-up") */
    5: {
      passingScore: 75,
      questions: [
        {
          text: "What's the minimum Wi-Fi speed, and how does the module suggest testing it on-site?",
          options: [
            "10 Mbps, using the router label",
            "25 Mbps throughout the space, using fast.com on your phone"
          ],
          correct: 1,
          explanation: "The minimum is 25 Mbps throughout the space, tested on-site with fast.com on your phone."
        },
        {
          text: "Which first-aid certifications qualify for the \u201ccertified person present\u201d check?",
          options: [
            "Red Cross, ASHI, or AHA",
            "OSHA or FEMA only",
            "Any in-state license"
          ],
          correct: 0,
          explanation: "Red Cross, ASHI, or AHA certifications qualify for the certified-person-present check."
        },
        {
          text: "The GuestGuard handbook displayed in the property covers which procedures?",
          options: [
            "Fire evacuation, power outage, and shelter-in-place",
            "Wi-Fi setup and check-out",
            "Pet and smoking policies"
          ],
          correct: 0,
          explanation: "The displayed handbook covers emergency procedures: fire evacuation, power outage, and shelter-in-place."
        },
        {
          text: "Per the wrap-up, what is the inspector's core job?",
          options: [
            "Decide whether a property passes or fails",
            "Document properties accurately and completely so guests know what they're booking and hosts know what to fix"
          ],
          correct: 1,
          explanation: "The inspector's core job is to document properties accurately and completely — so guests know what they're booking and hosts know what to fix. You don't decide pass/fail."
        }
      ]
    }
  }
};
