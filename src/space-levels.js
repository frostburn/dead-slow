/* The Black Meridian: local, planar spacecraft trials; metres and seconds. */
(function (root) {
    'use strict';
    const PI = Math.PI;
    const berth = (x, y, a = 0, extra = {}) => ({ x, y, a, l: 48, w: 28, speed: .24, angle: 8, ...extra });
    const rock = (id, x, y, radius, extra = {}) => ({ id, x, y, radius, ...extra });
    const courier = { name: 'CS KESTREL', vessel: 'space', length: 22, beam: 11, mass: 1, draft: 0 };
    const tug = { ...courier, name: 'UT MOTH', length: 20, beam: 12, mass: 1 };
    const warship = { ...courier, name: 'RS RESOLUTE', length: 38, beam: 15, mass: 1.8 };
    const levels = [
        {
            id: 'vacuum', name: 'Nothing to Push Against', kind: 'Burn · coast · counterburn',
            world: [900, 520], start: [120, 280, 0], berth: berth(760, 280),
            brief: 'Welcome to the Black Meridian. Burn toward Meridian Station, then fire the opposite thrusters to remove your velocity. There is no water, no drag and no automatic stabilization.',
            tip: 'W/S select fore/aft thrust. A/D fire rotational jets; counterfire to stop spinning. Q/E translate sideways without turning. Space cuts thrust, not velocity.',
            pace: [100, 150, 220], space: { mission: 'arrival', fuel: 90, acceleration: .36 }
        },
        {
            id: 'wandering-stone', name: 'A Stone with a Schedule', kind: 'Moving asteroid landing',
            world: [960, 560], start: [125, 210, 0], berth: berth(745, 205),
            brief: 'Land at the survey cradle on asteroid Hilda. The rock drifts slowly north and south. Match the moving cradle’s velocity, not merely its position, and hold with thrust cut.',
            tip: 'The dashed landing box rides with Hilda. REL speed measures motion against the cradle. Granite is still solid; land beside it, not through it.',
            pace: [130, 195, 280], space: {
                mission: 'landing', fuel: 100, acceleration: .34,
                asteroids: [rock('hilda', 745, 300, 65, { motion: { ay: 38, period: 240 } }), rock('shard', 460, 375, 48)],
                landing: { asteroid: 'hilda', offset: [0, -95] }
            }
        },
        {
            id: 'last-fill', name: 'The Last Fill Before Dark', kind: 'Rendezvous · refuel · intercept',
            world: [5200, 650], start: [110, 330, 0], berth: berth(780, 330, 0, { motion: { vx: 4.2 } }),
            brief: 'Your tank contains only 4 m/s of impulse. Faraday Port is already receding at 4.2 m/s: you cannot catch it on that reserve. Rendezvous with the slower tanker, hold for refuelling, then intercept the port.',
            tip: 'The amber tanker moves at 1.1 m/s. Match its velocity with less than 0.24 m/s relative drift. Refuelling takes six uninterrupted seconds with every jet cut. You keep moving together.',
            pace: [285, 400, 570], space: {
                mission: 'refuel', fuel: 4, capacity: 85, acceleration: .34,
                depot: berth(320, 330, 0, { motion: { vx: 1.1 }, label: 'LAST FILL', hold: 6 })
            }
        },
        {
            id: 'family-reunion', name: 'Some Assembly Required', kind: 'Two tenders · one mothership',
            world: [1000, 650], start: [120, 225, 0], berth: berth(850, 320, 0, { l: 118, w: 106 }),
            brief: 'Dock Kestrel on the upper cradle of the mothership, then fly Wren into the lower cradle. Control transfers automatically after each capture. Finally bring the assembled, heavier Wayfarer to the spaceport.',
            tip: 'The active cradle is amber. Match its arrow and cut every jet for the two-second capture. Docked tenders become part of Wayfarer’s mass and collision envelope.',
            pace: [265, 380, 550], space: {
                mission: 'assembly', fuel: 200, acceleration: .36,
                mother: { x: 460, y: 320, a: 0, length: 72, beam: 28, mass: 2.7, name: 'MS WAYFARER' },
                second: { x: 120, y: 415, a: 0, name: 'CS WREN' }
            }
        },
        {
            id: 'newtons-broadside', name: 'Newton’s Broadside', kind: 'Steady · fire · recover',
            world: [1000, 650], start: [150, 450, 0], spec: warship, berth: berth(150, 450, 0, { l: 64, w: 32 }),
            brief: 'Move Resolute into the marked firing box. Rotate toward the practice target, stop drifting and spinning, and hold the firing solution for three seconds. The cannon fires automatically. Recover from recoil and return home.',
            tip: 'Follow the lead diamond. All jets must be cut to charge the cannon. A miss can be corrected and retried; a hit unlocks the home capture cradle. Recoil changes velocity, not just the screen.',
            pace: [230, 350, 500], space: {
                mission: 'gunnery', fuel: 240, acceleration: .5,
                firing: berth(555, 440, -PI / 2, { l: 78, w: 70 }),
                target: { x: 555, y: 130, a: 0, length: 44, beam: 21, radius: 14, name: 'PRACTICE HULK' }
            }
        },
        {
            id: 'moving-argument', name: 'A Moving Argument', kind: 'Lead the target',
            world: [1050, 680], start: [140, 470, 0], spec: warship, berth: berth(140, 470, 0, { l: 64, w: 32 }),
            brief: 'The target this time is an enemy corvette moving across your field of fire. Reach the firing box, hold a steady lead solution, and let the cannon speak. Then recover and bring Resolute home.',
            tip: 'Aim at the hollow lead diamond, not the hull. The intercept marker includes projectile travel time. The three-second lock resets when the aim or attitude drifts out of tolerance.',
            pace: [240, 370, 520], space: {
                mission: 'gunnery', fuel: 260, acceleration: .5,
                firing: berth(580, 455, -PI / 2, { l: 90, w: 80 }),
                target: { x: 580, y: 130, a: 0, length: 42, beam: 18, radius: 12, name: 'HOSTILE CORVETTE', motion: { ax: 70, period: 260 } }
            }
        },
        {
            id: 'equal-and-opposite', name: 'Equal and Opposite', kind: 'Attractor / repulsor rescue',
            world: [1100, 640], start: [190, 355, 0], spec: tug, berth: berth(920, 220),
            brief: 'The survey launch has lost propulsion. Lock your beam with F. Hold J to attract it or K to repel it. Both vessels feel equal and opposite forces. Settle the launch in the green rescue cradle, release the beam, and dock Moth.',
            tip: 'Beam range is 170 m; rock blocks the line of sight. Attraction is not a brake on the pair’s centre of mass. Reverse the beam or reposition to remove the launch’s velocity before capture.',
            pace: [280, 440, 650], space: {
                mission: 'rescue', fuel: 220, acceleration: .65,
                friendly: { x: 330, y: 355, a: 0, length: 32, beam: 15, mass: 1.7, name: 'SURVEY LAUNCH' },
                rescue: berth(790, 355, 0, { l: 66, w: 40, angle: 16, speed: .3 }),
                asteroids: [rock('black-pearl', 550, 165, 60)]
            }
        },
        {
            id: 'umbra', name: 'The Safe Side of a Stone', kind: 'Hide from stellar flares',
            world: [1050, 620], start: [350, 375, 0], berth: berth(900, 215),
            brief: 'The star flares for fourteen seconds in every fifty-six. Direct rays destroy an unshielded hull in seconds. Travel between the long shadows of the asteroids, take the survey reading, and reach the sheltered station.',
            tip: 'Light arrives from the left. Shadows are cast by the actual rocks and protect only the hull points inside them. Time lateral transfers for the quiet interval; turn off thrust early enough to stay in cover.',
            pace: [220, 340, 490], space: {
                mission: 'flare', fuel: 180, acceleration: .36, flare: { period: 56, on: 14, offset: 22 },
                survey: { x: 650, y: 215, r: 42, hold: 2, name: 'Shadow survey' },
                asteroids: [rock('haven', 255, 375, 64), rock('umbra', 535, 215, 58), rock('terminus', 795, 505, 58)]
            }
        },
        {
            id: 'borrowed-sun', name: 'Borrowed Sunlight', kind: 'Solar-only thrust',
            world: [1000, 620], start: [125, 370, 0], berth: berth(850, 270),
            brief: 'No battery, no reactor. Your solar cells power all thrusters directly, and nothing fires in complete shadow. Pass the sunlit survey marker, then coast very gently into the dark-side observatory.',
            tip: 'Sunlight powers rotation and translation alike. Coasting with thrust cut still works in the dark. Brake in the light before entering the final shadow; escape to sunlight to correct a missed approach.',
            pace: [280, 420, 640], space: {
                mission: 'solar', fuel: 180, acceleration: .36, solar: true,
                survey: { x: 600, y: 175, r: 38, hold: 1, name: 'Solar survey' },
                asteroids: [rock('eclipse', 465, 315, 72)]
            }
        },
        {
            id: 'yesterday', name: 'Yesterday Has Right of Way', kind: 'A collision with your own history',
            world: [1100, 650], start: [135, 275, 0], berth: berth(940, 180),
            brief: 'First dock at the amber chronogate. It sends you back to the departure area, one lane south, while your first flight becomes a solid replay. Reach the experimental spaceport without colliding with your past self.',
            tip: 'The violet craft repeats exactly what you just flew, not an invented route. Your run clock never rewinds. The gate returns you with your arrival velocity and fuel; plan both flights. A paradox ends the run.',
            pace: [250, 370, 540], space: {
                mission: 'time', fuel: 190, acceleration: .36,
                chrono: berth(690, 275), returnAt: [135, 405], maxLoop: 900
            }
        },
        {
            id: 'cold-transit', name: 'Cold Transit', kind: 'An unpowered corridor',
            world: [1100, 650], start: [120, 325, 0], berth: berth(950, 325),
            brief: 'A superconducting freight scanner blocks all thruster power inside its field. Enter the corridor on a stable coast, dodge the moving maintenance drones, and brake only after clearing the far coil.',
            tip: 'The violet field disables attitude jets as well as main engines. Set rotation to zero before entry. The drones repeat their schedules, so retries preserve the same openings.',
            pace: [180, 270, 390], space: {
                mission: 'cold', fuel: 140, acceleration: .36,
                blackout: { x: 390, y: 120, w: 240, h: 400 },
                survey: { x: 525, y: 325, r: 46, hold: .1, name: 'Scanner transit' },
                asteroids: [rock('drone-a', 470, 325, 19, { motion: { ay: 155, period: 98, phase: 1.2 }, drone: true }), rock('drone-b', 575, 325, 19, { motion: { ay: 140, period: 125, phase: 3.1 }, drone: true })]
            }
        },
        {
            id: 'perihelion-dispatch', name: 'Perihelion Dispatch', kind: 'Fuel · rescue · flare shelter',
            world: [1300, 700], start: [280, 480, 0], spec: tug, berth: berth(1130, 290),
            brief: 'Take fuel at the shielded depot, then use the beam to recover a disabled tender before docking at Perihelion Station. Flares sweep the sector. The tender is radiation-hardened; your tug is not.',
            tip: 'Secure fuel before moving the tender. Use the long shadow lanes for towing and reserve the quiet interval for changes of latitude. Cargo must be captured and the beam released before the final docking hold.',
            pace: [480, 680, 960], space: {
                mission: 'dispatch', fuel: 18, capacity: 220, acceleration: .65,
                depot: berth(410, 480, 0, { hold: 6, label: 'SHIELDED DEPOT' }),
                friendly: { x: 670, y: 480, a: 0, length: 34, beam: 16, mass: 1.9, name: 'TENDER NANSEN' },
                rescue: berth(1040, 480, 0, { l: 70, w: 44, angle: 16, speed: .3 }),
                flare: { period: 72, on: 14, offset: 30 },
                asteroids: [rock('depot-shield', 175, 480, 65), rock('station-shield', 940, 290, 72)]
            }
        },
        {
            id: 'century-ship', name: 'The Century Ship', kind: 'BONUS · a very long coast', bonus: true,
            world: [111500, 900], start: [128, 450, 0], berth: berth(110720, 450, 0, { l: 84, w: 44, speed: .24 }),
            spec: { ...courier, name: 'IS CENTURY', length: 48, beam: 18, mass: 1 },
            brief: 'A compressed interstellar voyage, outside every marathon. The next system is 110.592 km away on this navigation chart. At just 0.12 m/s², even the best possible rest-to-rest flight takes more than thirty minutes of in-game time. Nothing will slow you down for free.',
            tip: 'This is a distance-and-acceleration bound, not a waiting timer. Plan a halfway counterburn. The console can accelerate practice; assisted voyages never enter the records. Z cycles between sector overview and local tracking.',
            pace: [1980, 2250, 2700], space: { mission: 'century', fuel: 300, acceleration: .12, lateral: 0, century: true }
        }
    ];
    for (const l of levels) {
        l.spec = { ...courier, ...l.spec };
        l.space.asteroids = l.space.asteroids || [];
        l.space.capacity = l.space.capacity ?? l.space.fuel;
    }
    if (typeof module !== 'undefined' && module.exports) module.exports = levels;
    root.HarborSpaceLevels = levels;
})(typeof globalThis !== 'undefined' ? globalThis : this);
