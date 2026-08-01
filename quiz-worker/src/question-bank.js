export const CURRICULUM_CATEGORIES = [
  { id: 'fundamentals', label: 'GuestGuard purpose and inspector role', testCount: 5 },
  { id: 'workflow', label: 'Workflow, remediation, and documentation', testCount: 5 },
  { id: 'exterior', label: 'Exterior, access, pools, and pets', testCount: 5 },
  { id: 'fire', label: 'Fire safety and emergency evacuation', testCount: 5 },
  { id: 'hazards', label: 'Electrical, utilities, detectors, and hazards', testCount: 5 },
  { id: 'accessibility', label: 'Accessibility measurements and judgment', testCount: 5 },
  { id: 'kitchen', label: 'Kitchen and appliances', testCount: 5 },
  { id: 'bathroom_hallway', label: 'Bathroom and hallway', testCount: 5 },
  { id: 'bedroom_common', label: 'Bedroom and common room', testCount: 5 },
  { id: 'overall', label: 'Overall property and guest experience', testCount: 5 }
];

function question(id, category, text, options, correct) {
  return {
    id,
    category,
    text,
    options: options.map((option, index) => ({ id: `o${index + 1}`, text: option })),
    correct: `o${correct + 1}`
  };
}

export const REAL_QUESTION_BANK = [
  // GuestGuard purpose and inspector role
  question('q001','fundamentals','What is GuestGuard’s primary role in the short-term rental industry?',[
    'A third-party auditing system for property quality and consistency',
    'A booking marketplace that sets nightly prices for rental properties',
    'A property manager that handles reservations and guest communication',
    'A licensing board that regulates residential building construction'
  ],0),
  question('q002','fundamentals','How does a GuestGuard inspection differ from a traditional home inspection?',[
    'It evaluates only cosmetic features that appear in listing photographs',
    'It focuses on the guest experience rather than a buyer’s structural concerns',
    'It replaces professional observation with a host-completed questionnaire',
    'It concentrates on estimating repairs before a residential property sale'
  ],1),
  question('q003','fundamentals','Which set best describes the main GuestGuard inspection focus?',[
    'Pricing, occupancy, advertising, revenue, and local tax compliance',
    'Structure, foundation, roofing, resale value, and title documentation',
    'Safety, comfort, accessibility, cleanliness, and guest amenities',
    'Reservations, cancellations, refunds, reviews, and host availability'
  ],2),
  question('q004','fundamentals','Why does GuestGuard use a standardized inspection framework?',[
    'To guarantee that every certified property has identical furniture',
    'To eliminate the need for inspectors to use professional judgment',
    'To determine which booking platform must advertise each property',
    'To give guests verified information and hosts consistent standards'
  ],3),
  question('q005','fundamentals','What is a major benefit of certification for a property host?',[
    'It guarantees a specific occupancy rate during every travel season',
    'It provides a marketing asset and actionable property feedback',
    'It transfers responsibility for property maintenance to GuestGuard',
    'It automatically satisfies every local rental licensing requirement'
  ],1),
  question('q006','fundamentals','What should guide an inspector’s judgment throughout the rubric?',[
    'Whether a guest would feel comfortable and well cared for',
    'Whether the property resembles other rentals in the neighborhood',
    'Whether the host has chosen the least expensive available equipment',
    'Whether each room contains the same number of listed amenities'
  ],0),
  question('q007','fundamentals','Why are many of the 169 rubric questions conditional?',[
    'They are reserved for inspectors who hold additional state licenses',
    'They are selected according to the host’s preferred inspection length',
    'They appear only after the inspector completes the overall property score',
    'They appear only when a property feature makes them relevant'
  ],3),
  question('q008','fundamentals','What is the inspector’s responsibility when a hazard is found?',[
    'Repair the hazard if the work can be completed during the visit',
    'Decide whether the property must be removed from all rental platforms',
    'Document the condition clearly so the host can address it',
    'Negotiate a repair schedule directly with the next arriving guest'
  ],2),
  question('q009','fundamentals','What professional activities carry over from traditional inspection work?',[
    'Observing, testing, measuring, and documenting property conditions',
    'Advertising, booking, collecting deposits, and resolving guest disputes',
    'Appraising, financing, underwriting, and transferring property ownership',
    'Designing, permitting, constructing, and furnishing rental properties'
  ],0),
  question('q010','fundamentals','Why are amenities recorded even when they are not strict pass-fail items?',[
    'They determine which inspector receives the next available assignment',
    'They replace safety findings when a property has premium features',
    'They establish the property’s assessed value for insurance purposes',
    'They help guests understand the experience the property provides'
  ],3),

  // Workflow, remediation, and documentation
  question('q011','workflow','How should an inspector move through the property?',[
    'Complete all safety questions first, then return for the remaining items',
    'Finish each room before moving to the next room',
    'Photograph every room first, then complete the rubric off-site',
    'Begin with amenities and leave utility checks until the final pass'
  ],1),
  question('q012','workflow','Which device is recommended for completing an inspection?',[
    'A tablet because its room-by-room view is compact and easy to use',
    'A desktop computer because the rubric requires a wired connection',
    'A digital camera because mobile devices cannot upload inspection evidence',
    'A paper checklist because electronic responses are entered after the visit'
  ],0),
  question('q013','workflow','What happens after an inspector marks “no” on a remediable item?',[
    'The entire inspection closes and must be restarted by corporate staff',
    'The host receives an automatic certification with a warning attached',
    'A description is requested and a remediation task is created',
    'The inspector must purchase the missing item before leaving the property'
  ],2),
  question('q014','workflow','Who signs off after a host submits evidence that a remediation was completed?',[
    'The next guest who books the certified rental property',
    'The local building department responsible for occupancy permits',
    'The inspector’s employer without reviewing the submitted evidence',
    'The GuestGuard corporate team after reviewing the correction'
  ],3),
  question('q015','workflow','What is the expected duration of a typical GuestGuard inspection?',[
    'Approximately fifteen to thirty minutes for a standard property',
    'Approximately one to two hours for a standard property',
    'Approximately three to four hours regardless of property features',
    'Approximately one full workday for every certified rental property'
  ],1),
  question('q016','workflow','Why would a five-to-ten-minute inspection raise concern?',[
    'It suggests the inspection was not completed with adequate care',
    'It means the host selected too few available appointment windows',
    'It prevents the digital platform from saving photographs correctly',
    'It indicates the inspector used a tablet instead of a computer'
  ],0),
  question('q017','workflow','What are the three job stages described in the training?',[
    'Requested, scheduled, and invoiced',
    'Pending, reviewed, and certified',
    'Open, inspected, and remediated',
    'Unassigned, assigned, and accepted'
  ],3),
  question('q018','workflow','What should an inspector do after viewing the host’s available time slots?',[
    'Select a slot and wait for the report to be completed by the host',
    'Create a new slot without consulting the host’s requested schedule',
    'Accept one slot so the job becomes active and the report can be filled out',
    'Assign the job to corporate before choosing an inspection time'
  ],2),
  question('q019','workflow','What two purposes do inspection photographs serve?',[
    'They support the guest listing and document observations for the host',
    'They replace written findings and eliminate the remediation process',
    'They verify inspector travel and determine geographic job assignments',
    'They establish property ownership and confirm the host’s tax records'
  ],0),
  question('q020','workflow','How should a photo of a flagged deficiency be taken?',[ 
    'From a distance so the entire room appears in a single image',
    'Clearly and carefully so the host can understand the deficiency',
    'Only after the host has corrected the deficiency during the visit',
    'Without lighting so the image reflects the room’s normal appearance'
  ],1),

  // Exterior, access, pools, and pets
  question('q021','exterior','Why must exterior walkways be clear and properly marked?',[
    'They provide an unobstructed route during emergency egress',
    'They create additional space for storing outdoor maintenance equipment',
    'They prevent guests from using entrances reserved for property staff',
    'They allow inspectors to skip the property’s interior exit assessment'
  ],0),
  question('q022','exterior','How close should accessible parking be to the front door?',[
    'Within fifteen feet of the front door',
    'Within twenty feet of the front door',
    'Within thirty feet of the front door',
    'Within fifty feet of the front door'
  ],2),
  question('q023','exterior','What minimum clearance is required on each side of a parked car?',[
    'At least eighteen inches on each side',
    'At least twenty-four inches on each side',
    'At least thirty-six inches on each side',
    'At least forty-eight inches on each side'
  ],1),
  question('q024','exterior','Why should overgrown shrubbery near the property be flagged?',[
    'It can interfere with the property’s wireless internet connection',
    'It can prevent the host from documenting cleaning procedures',
    'It can make outdoor cooking equipment difficult to photograph',
    'It can provide cover for an intruder near the property'
  ],3),
  question('q025','exterior','What should be documented when a lockbox or coded lock is present?',[
    'Its purchase receipt and the date the host installed it',
    'Its location and a photograph of the access device',
    'Its combination code and the names of all authorized users',
    'Its manufacturer warranty and replacement battery schedule'
  ],1),
  question('q026','exterior','Which pool condition satisfies the gate-lock portion of the rubric?',[
    'A functional latch, even when it is not a keyed lock',
    'A gate that closes only when pushed from the pool side',
    'A removable barrier stored near the pool equipment area',
    'A posted rule instructing guests to keep the gate closed'
  ],0),
  question('q027','exterior','What pool-fence measurements should an inspector record?',[
    'Fence length, post depth, and distance from the property',
    'Gate width, hinge size, and distance from the water',
    'Fence height and the largest vertical and horizontal gaps',
    'Panel thickness and the number of visible support posts'
  ],2),
  question('q028','exterior','Why should a hot-tub cover be on when the hot tub is not in use?',[
    'To preserve the manufacturer warranty on the heating system',
    'To reduce the time required for the cleanliness assessment',
    'To prevent chemicals from being stored near the equipment',
    'To improve safety for children and pets around the hot tub'
  ],3),
  question('q029','exterior','When do the exterior pet-friendly questions apply?',[
    'When the host allows guests to bring pets to the property',
    'When the inspector observes any animal near the property',
    'When the rental is located within walking distance of a park',
    'When the exterior includes a fenced patio or cooking area'
  ],0),
  question('q030','exterior','Which set belongs to the exterior pet-friendly assessment?',[
    'Indoor crates, pet food, grooming tools, and veterinary records',
    'Walking access, fenced dog space, and waste disposal facilities',
    'Pet insurance, vaccination records, and emergency contact numbers',
    'Floor coverings, feeding schedules, and designated sleeping areas'
  ],1),

  // Fire safety and emergency evacuation
  question('q031','fire','What does an ABC-rated fire extinguisher indicate?',[
    'It was manufactured for use only in commercial buildings',
    'It must be replaced within three years of the inspection',
    'It is effective against common household fire types',
    'It is approved only for outdoor cooking and pool areas'
  ],2),
  question('q032','fire','Which extinguisher condition requires remediation in the kitchen?',[ 
    'The pressure gauge needle was inside the green area',
    'The pin and tamper seal were intact',
    'The extinguisher had no visible dents or damage',
    'The extinguisher was not mounted at the required height'
  ],3),
  question('q033','fire','About how high above the floor should a home fire extinguisher be mounted?',[
    'Approximately five to six inches above the floor',
    'Approximately twelve to eighteen inches above the floor',
    'Approximately twenty-four to thirty inches above the floor',
    'Approximately forty-eight to sixty inches above the floor'
  ],0),
  question('q034','fire','What evidence is required when an extinguisher is stored out of sight?',[
    'A floor plan showing the extinguisher’s exact distance from an exit',
    'A sign marking its location, with the sign photographed',
    'A host statement confirming that guests receive verbal directions',
    'A cabinet inventory listing the extinguisher’s inspection history'
  ],1),
  question('q035','fire','How should a battery-powered or hardwired alarm be verified?',[
    'Use a certificate from any alarm company issued within five years',
    'Confirm the host has listed the alarm in the guest handbook',
    'Test it and upload a video under ten seconds capturing the sound',
    'Photograph the alarm without testing so the battery is preserved'
  ],2),
  question('q036','fire','What proof is acceptable for a monitored or local alarm system?',[
    'A current certificate from the alarm company within the last year',
    'A photograph showing the alarm housing and manufacturer name',
    'A receipt showing when the host purchased replacement batteries',
    'A written statement from a guest who heard the alarm previously'
  ],0),
  question('q037','fire','What additional check applies when a fire alarm is hardwired?',[
    'Confirm that the alarm is mounted near an exterior doorway',
    'Confirm that the alarm includes a replaceable backup siren',
    'Confirm that the host has supplied a portable testing ladder',
    'Confirm that the hardwired alarm is currently receiving power'
  ],3),
  question('q038','fire','When is an upper-floor bedroom escape ladder marked not applicable?',[
    'When the room has a charged flashlight near the bed',
    'For a ground-floor room or a bedroom in an apartment building',
    'When the room has two operational doors along the exit path',
    'For a bedroom with a hardwired smoke and carbon monoxide alarm'
  ],1),
  question('q039','fire','What should an inspector confirm about doors on an emergency exit path?',[
    'They match the color and materials used in the hallway',
    'They remain locked unless the host is present at the property',
    'They unlock from inside and have usable, stable hardware',
    'They open toward the nearest room rather than toward the exit'
  ],2),
  question('q040','fire','Which signage examples address open-flame safety?',[ 
    'No smoking, no candles, and no open fires',
    'No parking, no deliveries, and no unattended vehicles',
    'No pets, no food, and no outdoor footwear',
    'No visitors, no late arrivals, and no early departures'
  ],0),
  question('q101','fire','What is the ideal placement for a smoke detector?',[ 
    'In the corner of a room, far away from anything else',
    'Mounted low or on the floor so it is out of the way',
    'Within a cabinet or under a table or other furniture',
    'On the ceiling in a central location, and clearly visible'
  ],3),

  // Electrical, utilities, detectors, and hazards
  question('q041','hazards','Which wiring condition meets the GuestGuard visual standard?',[
    'Extension cords connected together when outlets are unavailable',
    'Power strips used only when they include surge protection',
    'Exposed wiring permitted when it is above guest reach',
    'Multiple high-load appliances connected to one basic adapter'
  ],1),
  question('q042','hazards','Where are GFCI outlets or breakers especially important?',[
    'In bedrooms and common rooms where televisions are located',
    'In hallways and closets where lighting remains switched on',
    'In kitchens, bathrooms, and other wet areas',
    'In exterior parking spaces without overhead lighting'
  ],2),
  question('q043','hazards','What should the basement breaker-box inspection confirm?',[
    'The box is labeled, accessible, covered, and visually safe',
    'The box has been replaced within the previous calendar year',
    'The box is hidden from guests behind a permanently locked door',
    'The box includes a separate circuit for every room and appliance'
  ],0),
  question('q044','hazards','Which flammable-material storage practice meets the safety standard?',[ 
    'Store flammable materials beside a furnace for easy access',
    'Keep flammable materials in open containers beneath a sink',
    'Store flammable materials securely and away from ignition sources',
    'Place flammable materials in guest-accessible rooms with no labeling'
  ],2),
  question('q045','hazards','What is the purpose of a water-leak or freeze detector?',[
    'It alerts the owner to a burst or frozen pipe condition',
    'It measures background noise near the property’s utilities',
    'It verifies that wet-area outlets include surge protection',
    'It records the operating temperature of the heating system'
  ],0),
  question('q046','hazards','Which devices belong in the “other hazard detectors” assessment?',[
    'Door sensors, window locks, and exterior motion lights',
    'CO, heat, and hazardous-gas detectors',
    'Thermostats, water meters, and appliance timers',
    'Cameras, microphones, and monitored entry systems'
  ],1),
  question('q047','hazards','Why are incandescent bulbs discouraged by GuestGuard?',[
    'They make it difficult to photograph appliance model numbers',
    'They interfere with hardwired carbon monoxide alarm systems',
    'They can heat up and create a fire risk in enclosed spaces',
    'They prevent GFCI testers from identifying unprotected outlets'
  ],2),
  question('q048','hazards','Where should an inspector look for mold or moisture-related growth in a kitchen?',[ 
    'Only on visible wall surfaces above the countertop',
    'Only inside the refrigerator and freezer compartments',
    'Only around windows located next to the cooking area',
    'Near sinks, piping, appliances, and other moisture sources'
  ],3),
  question('q049','hazards','How should pest evidence be evaluated during the inspection?',[
    'Use professional judgment in areas that guests can access',
    'Move fixed cabinets and walls to inspect every concealed cavity',
    'Accept the host’s pest-control statement without looking for signs',
    'Limit the check to exterior spaces where animals may enter'
  ],0),
  question('q050','hazards','What should happen when mold or moisture-related growth is found?',[
    'Clean the affected surface before continuing the inspection',
    'Photograph and document it for GuestGuard and the host',
    'Mark the entire room inaccessible without recording the location',
    'Contact the next guest and advise them to cancel the reservation'
  ],1),

  // Accessibility measurements and judgment
  question('q051','accessibility','When is the detailed accessibility assessment required?',[
    'For every property with more than one guest-accessible room',
    'Whenever the inspector observes a mobility device during the visit',
    'For properties identified in advance as accessibility-friendly',
    'Only after the standard inspection has produced a passing result'
  ],2),
  question('q052','accessibility','How is bathroom doorway width measured?',[
    'From the inside of the frame while the door is open',
    'From the outside edges of the trim while the door is closed',
    'From the handle to the opposite wall while the door is open',
    'From the hinge to the latch plate while the door is closed'
  ],0),
  question('q053','accessibility','What should be assessed when a bathroom approach is not straight?',[
    'Whether the hallway includes emergency exit signage',
    'Whether a wheelchair has enough room to turn around',
    'Whether the sink has adequate running water pressure',
    'Whether a portable handrail is stored beside the doorway'
  ],1),
  question('q054','accessibility','What defines a roll-in shower for the rubric?',[
    'A shower with a fixed chair and a standard raised curb',
    'A shower with a handheld head and two permanent handrails',
    'A shower large enough for standing assistance from another person',
    'A shower entered by wheelchair with no lip or a ramped rounded lip'
  ],3),
  question('q055','accessibility','What is recorded when a shower is not roll-in accessible?',[
    'The shower threshold height and the shower square footage',
    'The distance from the shower head to the bathroom doorway',
    'The combined height of the shower chair and toilet seat',
    'The width of the bathroom hallway and the sink countertop'
  ],0),
  question('q056','accessibility','Why are four toilet-clearance measurements collected?',[
    'To determine whether the toilet can support a portable handrail',
    'To determine whether a wheelchair user can transfer safely',
    'To calculate the total square footage of the bathroom',
    'To confirm the toilet is centered under the ventilation system'
  ],1),
  question('q057','accessibility','What should happen if a bedroom bed is under 24 inches high?',[
    'Mark the bedroom unusable without gathering more information',
    'Require the host to replace the bed before the report is submitted',
    'Ask whether bed raisers are available for the property',
    'Measure only the mattress because floor clearance no longer applies'
  ],2),
  question('q058','accessibility','What bedroom clearances should be measured around the bed?',[
    'The distance from each side to the nearest unmovable obstruction',
    'The distance from the headboard to every electrical outlet',
    'The distance from the mattress top to the nearest window',
    'The distance from the bedroom door to the television screen'
  ],0),
  question('q059','accessibility','What common-room feature should be checked for wheelchair dining access?',[
    'The distance between the table and the nearest exterior exit',
    'The number of chairs that can be removed without host assistance',
    'The width of the room measured between two opposite walls',
    'The table underside height and any bars blocking knee clearance'
  ],3),
  question('q060','accessibility','What should an inspector do when a room is not usable by a wheelchair user?',[
    'Select not applicable and omit any explanation from the report',
    'Describe the barriers because the note will be visible to guests',
    'Recommend a specific contractor before completing the inspection',
    'Estimate the cost of modifying the room for wheelchair access'
  ],1),

  // Kitchen and appliances
  question('q061','kitchen','Why are kitchen fire-safety checks more extensive?',[
    'The kitchen has the highest household fire risk',
    'The kitchen usually contains the property’s exit signage',
    'The kitchen is where the host stores the guest handbook',
    'The kitchen is always included in the accessibility assessment'
  ],0),
  question('q062','kitchen','How should a dishwasher be checked during the practical inspection?',[
    'Inspect the exterior only and record the manufacturer name',
    'Run a full cycle while continuing with the inspection',
    'Ask the host to provide a receipt from the last service visit',
    'Fill it with dishes to confirm the advertised capacity'
  ],1),
  question('q063','kitchen','What should the sink and disposal assessment include?',[
    'Cabinet dimensions, pipe materials, and installation dates',
    'Drain speed, faucet brand, and the host’s cleaning schedule',
    'Cleanliness, operation, water pressure, and visible leaks',
    'Water hardness, filter age, and the disposal’s electrical rating'
  ],2),
  question('q064','kitchen','How should kitchen GFCI protection be verified?',[
    'Assume protection is present when the outlet has a reset button',
    'Test one representative outlet and apply the result to the room',
    'Ask the host whether the breakers were installed by an electrician',
    'Use a tester on every relevant outlet in the wet area'
  ],3),
  question('q065','kitchen','What should be recorded for a safe, clean, usable appliance?',[
    'A photograph and the make and model when identifiable',
    'A replacement cost and the date the appliance was purchased',
    'A copy of the warranty and the host’s maintenance schedule',
    'A video of the full operating cycle and the energy rating'
  ],0),
  question('q066','kitchen','What is the priority if an appliance make or model cannot be identified?',[
    'Fail the appliance because the required record is incomplete',
    'Focus on whether the appliance is safe, clean, and usable',
    'Remove the appliance from the guest-facing property listing',
    'Require the host to submit the information before inspection ends'
  ],1),
  question('q067','kitchen','How was the microwave tested during the practice walkthrough?',[
    'By running a short cycle and checking operation and ventilation',
    'By heating it to maximum temperature for several minutes',
    'By inspecting the cord without operating the microwave',
    'By asking the host to demonstrate every programmed setting'
  ],0),
  question('q068','kitchen','What should be checked while the kitchen sink is running?',[
    'Whether the cabinet doors remain fully open without obstruction',
    'Whether the water temperature matches the refrigerator setting',
    'Whether plumbing below the sink shows leakage or broken pipes',
    'Whether the disposal manufacturer matches the faucet manufacturer'
  ],2),
  question('q069','kitchen','Which condition makes the microwave question not applicable?',[
    'The microwave is installed inside an enclosed cabinet',
    'The microwave is combined with the property’s oven',
    'The microwave has no visible manufacturer label',
    'The property does not provide a microwave'
  ],3),
  question('q070','kitchen','What final perspective should be used for the kitchen visual assessment?',[
    'Review only the appliances that appear in the rental listing',
    'Step back and assess floors, counters, cabinets, walls, and ceiling',
    'Evaluate only conditions that produced a required remediation',
    'Compare the kitchen design with other rentals in the same market'
  ],1),

  // Bathroom and hallway
  question('q071','bathroom_hallway','Which bathroom areas deserve particular attention during a mold check?',[
    'Moisture-prone spaces near the sink, shower, toilet, and cabinets',
    'Dry storage areas located above eye level and away from plumbing',
    'Only surfaces that the host identifies as recently repaired',
    'Only the doorway and hallway leading into the bathroom'
  ],0),
  question('q072','bathroom_hallway','How should toilet operation be confirmed?',[
    'Check the bowl visually without operating any controls',
    'Review the host’s most recent plumbing service receipt',
    'Flush it and check for cleanliness, damage, and leaks',
    'Measure water pressure at the sink and apply it to the toilet'
  ],2),
  question('q073','bathroom_hallway','What is the proper response when a bathroom has no electrical outlets?',[
    'Pass the GFCI requirement because the bathroom is a wet area',
    'Mark the GFCI outlet question not applicable',
    'Fail the bathroom because every bathroom requires an outlet',
    'Test the nearest hallway outlet as a substitute'
  ],1),
  question('q074','bathroom_hallway','Why is bathroom privacy explicitly confirmed?',[
    'To verify that housekeeping can enter between guest stays',
    'To confirm the room contains no host-owned personal items',
    'To determine whether the bathroom needs an accessibility review',
    'To disclose whether it is shared with hosts or other guests'
  ],3),
  question('q075','bathroom_hallway','Which bathroom amenities are informational rather than core requirements?',[
    'Bath soaps, shampoo, bathrobes, and a bidet',
    'GFCI protection, working plumbing, lighting, and privacy',
    'A clean toilet, operational shower, sink, and safe wiring',
    'Mold inspection, pest inspection, odor check, and visual assessment'
  ],0),
  question('q076','bathroom_hallway','What hallway measurement is recorded for accessibility?',[
    'The distance from the hallway entrance to the nearest bedroom',
    'The width of the narrowest guest-accessible hallway',
    'The height of every handle on doors along the exit route',
    'The total length of all unobstructed hallway segments'
  ],1),
  question('q077','bathroom_hallway','Which alarm types are listed in the hallway rubric?',[
    'Photoelectric, ionization, thermal, and combination alarms',
    'Residential, commercial, industrial, and portable alarms',
    'Monitored, local low-voltage, hardwired, and battery-powered alarms',
    'Audible, visual, vibrating, and voice-command alarms'
  ],2),
  question('q078','bathroom_hallway','What must be photographed when other hazard detectors are present?',[
    'Only the detector closest to the hallway entrance',
    'Only detectors that are not connected to electrical power',
    'Only detectors that combine smoke and carbon monoxide sensing',
    'All identified detectors included in the room assessment'
  ],3),
  question('q079','bathroom_hallway','What hallway condition represents a trip hazard?',[
    'An unexpected change in floor height or uneven walking surface',
    'A handrail installed beside a stairway along the exit route',
    'A clearly marked door that opens easily from the inside',
    'A powered detector mounted near the center of the hallway'
  ],0),
  question('q080','bathroom_hallway','What should the inspector do with optional conditions not covered by bathroom questions?',[
    'Ignore them because optional findings cannot appear in the report',
    'Record them in the additional-notes area for the room',
    'Convert them into accessibility failures before leaving the room',
    'Add them to the kitchen section where utilities are documented'
  ],1),

  // Bedroom and common room
  question('q081','bedroom_common','What emergency equipment should be available and tested in each bedroom?',[
    'A charged flashlight for guest use',
    'A portable GFCI testing device',
    'A combination safe for valuables',
    'A battery-powered sound meter'
  ],0),
  question('q082','bedroom_common','What should happen after checking bedding and the mattress for bed bugs?',[
    'Leave the bedding removed so the host can inspect it',
    'Photograph every layer before replacing the mattress',
    'Remake the bed after completing the visual check',
    'Replace the sheets with a sealed inspection set'
  ],2),
  question('q083','bedroom_common','How should air conditioning be recorded when the climate does not require it?',[
    'Mark the item no and create a required remediation',
    'Mark the item not applicable for that property',
    'Mark the item yes if a portable fan is available',
    'Leave the item unanswered for corporate review'
  ],1),
  question('q084','bedroom_common','What bedroom lock information is documented?',[
    'Whether the lock is electronic, mechanical, or remotely monitored',
    'Whether the host changes the lock code between every reservation',
    'Whether the lock meets the local building code for rental units',
    'Whether there is no lock, a non-keyed lock, or a keyed lock'
  ],3),
  question('q085','bedroom_common','Which bedroom item is recommended for securing guest valuables?',[
    'A combination safe accessible to the guest',
    'A locked host closet inside the bedroom',
    'A monitored camera pointed toward the entry',
    'A keyed cabinet controlled by property staff'
  ],0),
  question('q086','bedroom_common','What should be recorded when a smart TV is available?',[
    'The purchase date and remaining manufacturer warranty',
    'The streaming services available through host-provided credentials',
    'The television’s screen dimensions and electrical consumption',
    'The guest accounts previously used to sign into each service'
  ],1),
  question('q087','bedroom_common','What common-room doorway condition may require a threshold ramp?',[
    'A doorway with a lip or raised bump in the floor',
    'A doorway with a coded lock or exterior access',
    'A doorway located beside the main dining table',
    'A doorway wider than the narrowest hallway'
  ],0),
  question('q088','bedroom_common','Which common-room entertainment items should be documented?',[
    'Only televisions and devices permanently attached to the wall',
    'Only amenities that require host-provided login credentials',
    'Reading materials, TV services, games, and local information',
    'Furniture brands, decorative artwork, and lighting controls'
  ],2),
  question('q089','bedroom_common','What should be recorded when a washer and dryer are present?',[
    'Only whether the appliances are located in a private space',
    'Their water use and estimated cost for a normal cycle',
    'The cleaning products the host requires guests to use',
    'Condition, usability, photographs, and make and model'
  ],3),
  question('q090','bedroom_common','Where should an inspector look for a recommended bedroom safe?',[
    'In the room and logical storage spaces such as the closet',
    'Only beside the bed where it is immediately visible',
    'Only in the attached bathroom or common room',
    'Inside any host-locked storage area without permission'
  ],0),

  // Overall property and guest experience
  question('q091','overall','Where should the host and guest handbook be displayed?',[ 
    'Inside a locked cabinet reserved for host documents',
    'In a conspicuous location where guests can find it',
    'Beside the breaker box in the maintenance room',
    'Outside the property near the primary parking space'
  ],1),
  question('q092','overall','Which procedures should be covered by the host handbook?',[ 
    'Booking changes, refund requests, and review disputes',
    'Appliance warranties, utility billing, and repair scheduling',
    'Fire evacuation, power outage, and shelter-in-place guidance',
    'Cleaning invoices, tax records, and insurance claims'
  ],2),
  question('q093','overall','When is the first-aid-certification item marked not applicable?',[
    'When the host or representative will not be present during stays',
    'When the property has a complete and accessible first-aid kit',
    'When the certification was issued by the Red Cross or AHA',
    'When the inspector cannot photograph the original certificate'
  ],0),
  question('q094','overall','Which set belongs in a complete first-aid kit?',[
    'Thermometer, flashlight, batteries, water, and emergency radio',
    'Prescription medicine, splints, oxygen, and medical instruments',
    'Cleaning chemicals, masks, towels, soap, and disinfectant spray',
    'Bandages, gauze, tape, wipes, gloves, scissors, tweezers, and pain relievers'
  ],3),
  question('q095','overall','How should Wi-Fi performance be checked?',[
    'Test throughout the rental while connected to the local network',
    'Read the advertised plan speed from the host’s internet bill',
    'Test beside the router and apply that result to the whole property',
    'Ask a previous guest whether streaming worked during the stay'
  ],0),
  question('q096','overall','What minimum Wi-Fi speed is specified in the training?',[
    'At least ten Mbps throughout the rented space',
    'At least twenty-five Mbps throughout the rented space',
    'At least fifty Mbps beside the primary wireless router',
    'At least one hundred Mbps at the property entrance'
  ],1),
  question('q097','overall','Which tool is recommended for measuring background noise?',[
    'The fast.com network performance website',
    'The property’s monitored alarm control panel',
    'The NIOSH Sound Level Meter smartphone app',
    'The digital inspection platform’s photo uploader'
  ],2),
  question('q098','overall','Why should a host’s own pets be disclosed?',[
    'They determine whether exterior exit signs are required',
    'They change the minimum internet speed for the rental',
    'They replace the need for a guest-facing pet policy',
    'They matter to guests with allergies or animal preferences'
  ],3),
  question('q099','overall','What should be confirmed when guests are allowed to bring pets?',[
    'A pet policy is included in the rental listing',
    'A veterinarian is available during every guest stay',
    'The host supplies food for every permitted animal',
    'A separate inspection report exists for each species'
  ],0),
  question('q100','overall','What is the inspector’s core purpose at the end of the full rubric?',[
    'Assign a final property grade without corporate review',
    'Document accurately so guests know what they book and hosts know what to fix',
    'Require every recommended amenity before certification can proceed',
    'Estimate renovation costs for all conditions recorded in the report'
  ],1)
];
