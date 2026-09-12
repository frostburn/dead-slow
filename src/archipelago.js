/* World 3: fictional Nordic island-service routes. All scenery is drawn locally. */
(function (root) {
    'use strict';
    const D = Math.PI / 180;
    const FERRY = {
        length: 34, beam: 13, mass: 1.15, draft: 2.8, vessel: 'ferry', propulsion: 1.15, capacity: 6, name: 'MS LINNEA'
    };
    const TUG = {
        length: 22, beam: 8, mass: .82, draft: 3.1, vessel: 'tug', propulsion: 1.85, name: 'MT SISU'
    };
    function island(x, y, rx, ry, name, seed = 1) {
        const radii = [.93, 1, .92, 1, .9, .98, .91, 1];
        return {
            x, y, rx, ry, name, seed, poly: radii.map((r, i) => ({ x: x + rx * r * Math.cos(i * Math.PI / 4), y: y + ry * r * Math.sin(i * Math.PI / 4) }))
        };
    }
    const quay = (x, y, w, h, label) => ({
        x, y, w, h, label, material: 'wood'
    });
    const slip = (x, y, a = 0) => ({
        x, y, a, l: 48, w: 27, angle: 12, speed: .20
    });
    const load = (name, x, y, vehicles, a = 0) => ({
        type: 'load', name, ...slip(x, y, a), vehicles, rampEnd: -1
    });
    const unload = (name, x, y, count, a = 0) => ({
        type: 'unload', name, ...slip(x, y, a), count, rampEnd: 1
    });
    const tow = (target, name, x, y, l, w, a = 0) => ({
        type: 'tow', target, name, x, y, l, w, a, angle: 22, speed: .42, hold: 2
    });
    const boat = (id, name, x, y, length, beam, mass, vessel = 'yacht', a = 0) => ({
        id, name, start: [x, y, a], length, beam, mass, draft: 3, vessel
    });
    const berth = (x, y, a = 0) => ({
        x, y, a, l: 45, w: 25, speed: .48
    });
    const lee = (x, y, w, h) => ({
        x, y, w, h, feather: 14, label: 'SHELTERED ROADSTEAD'
    });
    const levels = [
        {
            id: 'first-crossing', name: 'The First Crossing', kind: 'Four vehicles · one quiet crossing', world: [520, 310], start: [88, 156, 0], spec: FERRY, berth: slip(432, 156),
            brief: 'The island road ends at the water. Hold neutral at Birch Landing while four vehicles drive aboard, cross to Juniper, and unload at the bow ramp.',
            tip: 'The loading outline works like a berth: whole hull inside, arrow matched, nearly stopped and neutral. Transfer is automatic. The yellow deck fills one vehicle at a time.',
            pace: [155, 215, 300], jobs: [load('Birch · board 4', 88, 156, ['car', 'car', 'van', 'car']), unload('Juniper · unload 4', 432, 156, 4)],
            obstacles: [quay(39, 133, 30, 46, 'BIRCH'), quay(451, 133, 29, 46, 'JUNIPER')],
            islands: [island(32, 155, 27, 63, 'Birch', 1), island(490, 155, 22, 66, 'Juniper', 2), island(252, 67, 56, 30, 'Kivikari', 3), island(281, 251, 72, 32, '', 4)]
        },
        {
            id: 'bigger-boat', name: 'A Bigger Boat', kind: 'Tug initiation · a 56-metre yacht', world: [520, 310], start: [153, 156, 0], spec: TUG, berth: berth(445, 156),
            brief: 'Elvira has lost her engine. Your stern is already near her bow: make fast with F, take up the slack gently, and tow her into the broad green rescue berth. Then moor Sisu at the service pier.',
            tip: 'F makes or releases the line. Hold J to reel in, K to pay out. A rope pulls; it cannot push or brake the yacht for you. Slow early and let her coast into her own berth.',
            pace: [195, 285, 410], towables: [boat('elvira', 'ELVIRA', 80, 156, 56, 13, 2.4)], jobs: [tow('elvira', 'Elvira · rescue berth', 326, 156, 80, 36)],
            obstacles: [quay(277, 178, 89, 13, 'RESCUE QUAY'), quay(416, 171, 64, 13, 'SERVICE PIER')],
            islands: [island(248, 66, 64, 33, 'Rönnskär', 6), island(246, 254, 76, 33, '', 7), island(43, 69, 24, 29, '', 8)]
        },
        {
            id: 'milk-run', name: 'The Milk Run', kind: 'A five-car manifest · two island calls', world: [600, 380], start: [88, 274, 0], spec: FERRY, berth: slip(502, 91),
            brief: 'Five vehicles, two destinations. Board at Pine Landing, drop two at Alder, then carry the remaining three north to the village of Rowan. No one gets left on the wrong island.',
            tip: 'Your manifest shows how many vehicles remain aboard. Each call is a separate timed split. Back clear of a ramp before beginning the next turn.',
            pace: [280, 390, 540], jobs: [load('Pine · board 5', 88, 274, ['car', 'van', 'car', 'car', 'car']), unload('Alder · unload 2', 502, 274, 2), unload('Rowan · unload 3', 502, 91, 3)],
            obstacles: [quay(39, 251, 30, 46, 'PINE'), quay(521, 251, 34, 46, 'ALDER'), quay(521, 68, 34, 46, 'ROWAN')],
            islands: [island(31, 274, 27, 55, 'Pine', 3), island(562, 273, 30, 63, 'Alder', 9), island(561, 90, 30, 55, 'Rowan', 10), island(292, 157, 64, 71, 'Långön', 11), island(197, 326, 49, 24, '', 12)]
        },
        {
            id: 'floating-sauna', name: 'The Floating Sauna', kind: 'An unpowered pontoon · a long corner', world: [600, 380], start: [144, 256, 0], spec: TUG, berth: berth(522, 119),
            brief: 'The village sauna is moving to a sunnier anchorage. Tow its broad pontoon south of the wooded island, round the course mark and bring it alongside the bathing pier.',
            tip: 'A wide load cuts inside your turns. Give the granite a generous berth. Pay out line on the open reach; reel in only when both vessels are moving slowly.',
            pace: [290, 410, 570], towables: [boat('sauna', 'FLOATING SAUNA', 80, 256, 38, 18, 2.3, 'sauna')], jobs: [tow('sauna', 'Sauna · bathing pier', 406, 119, 66, 40)],
            buoys: [
                { x: 331, y: 261, r: 31, name: 'Round the skerry' }
            ], obstacles: [quay(369, 144, 81, 12, 'BATHING PIER'), quay(497, 135, 76, 12, 'BOAT HOUSE')],
            islands: [island(258, 132, 60, 79, 'Tallskär', 14), island(166, 337, 74, 24, '', 15), island(466, 56, 55, 23, '', 16)]
        },
        {
            id: 'market-day', name: 'Market Day', kind: 'A full ferry · no wake · pleasure traffic', world: [560, 340], start: [88, 173, 0], spec: FERRY, berth: slip(472, 173),
            brief: 'The Saturday market fills every space on deck. Carry six cars through the no-wake village channel while two small boats cross the fairway. Unload at the market ramp.',
            tip: 'The loaded ferry takes longer to stop. The yellow water is a clean-run speed limit, not a hidden time penalty. Neither pleasure boat will give way.',
            pace: [245, 345, 480], jobs: [load('Mainland · board 6', 88, 173, ['car', 'car', 'car', 'van', 'car', 'car']), unload('Market · unload 6', 472, 173, 6)],
            obstacles: [quay(39, 150, 30, 46, 'MAINLAND'), quay(491, 150, 34, 46, 'MARKET')], speedZones: [
                {
                    x: 208, y: 109, w: 126, h: 129, limit: 1.5
                }
            ],
            traffic: [
                {
                    id: 'weekender', from: [364, 65], to: [364, 279], speed: 1.1, offset: 23, length: 12, beam: 4.5
                }, {
                    id: 'dinghy', from: [169, 269], to: [169, 76], speed: 1.4, offset: 81, length: 10, beam: 4
                }
            ],
            islands: [island(31, 173, 27, 70, '', 17), island(534, 173, 23, 63, 'Market', 18), island(269, 60, 60, 33, 'Björkby', 19), island(292, 284, 68, 31, '', 20)]
        },
        {
            id: 'granite-needle', name: 'The Granite Needle', kind: 'A heavy work barge · a rocky passage', world: [620, 380], start: [148, 240, 0], spec: TUG, berth: berth(552, 240),
            brief: 'A 66-metre work barge is needed at the island repair yard. Take it between the granite heads and settle the whole barge inside the yard berth before parking the tug.',
            tip: 'Watch the barge, not just the tug. Towlines do not wrap around islands: a line dragged across rock will chafe through. Slack off before changing direction.',
            pace: [280, 405, 570], towables: [boat('workbarge', 'WORK BARGE', 80, 240, 66, 15, 3.8, 'barge')], jobs: [tow('workbarge', 'Barge · repair yard', 436, 240, 88, 36)],
            obstacles: [quay(390, 263, 94, 13, 'REPAIR YARD'), quay(529, 256, 67, 13, 'TUG BERTH')],
            islands: [island(303, 112, 49, 79, 'North Tooth', 21), island(320, 331, 52, 33, 'South Tooth', 22), island(461, 75, 69, 30, '', 23)]
        },
        {
            id: 'last-bus', name: 'The Last Bus Home', kind: 'Bus and vans · a bridge signal', world: [580, 380], start: [88, 263, 0], spec: { ...FERRY, length: 38, mass: 1.27 }, berth: slip(489, 88, -90 * D),
            brief: 'The bus driver missed the road ferry. Board the bus, two cars and a van, catch the swing-bridge window, then turn north into the village ramp.',
            tip: 'The bus is heavier than a car. Clear the bridge with your stern before starting the turn. The entire ferry must face north at the unloading slip.',
            pace: [285, 400, 560], jobs: [load('Road end · board 4', 88, 263, ['bus', 'car', 'car', 'van']), unload('Village · unload 4', 489, 88, 4, -90 * D)],
            gates: [
                {
                    id: 'swing-bridge', x: 271, y: 151, w: 7, h: 178, kind: 'timed', period: 53, open: 25, offset: 11
                }
            ],
            obstacles: [quay(36, 240, 30, 46, 'ROAD END'), quay(466, 39, 46, 28, 'VILLAGE')],
            islands: [island(30, 263, 25, 67, '', 24), island(274, 77, 47, 89, 'Bridge Island', 25), island(274, 357, 43, 37, '', 26), island(489, 29, 71, 24, 'Village', 27), island(390, 302, 40, 25, '', 28)]
        },
        {
            id: 'slackwater-salvage', name: 'Slack Water Salvage', kind: 'Coastal packet · a pulsing channel set', world: [620, 380], start: [150, 243, 0], spec: TUG, berth: berth(552, 175),
            brief: 'Recover the disabled coastal packet through the channel race and deliver it to sheltered water. The cross-set pulses: your tug and its tow enter it at different times.',
            tip: 'The tow has its own local-current sample. A slack-water crossing makes it easier to keep both hulls on the same line. Do not stop in the race.',
            pace: [335, 475, 670], current: [0, .04], currentZones: [
                {
                    x: 227, y: 128, w: 119, h: 175, feather: 20, current: [0, .50], pulse: { period: 73, min: .08, phase: -Math.PI / 2 }, label: 'CHANNEL RACE'
                }
            ],
            towables: [boat('packet', 'COASTAL PACKET', 80, 243, 62, 14, 3.2, 'packet')], jobs: [tow('packet', 'Packet · sheltered wharf', 440, 175, 86, 36)], shelters: [lee(365, 130, 224, 105)],
            obstacles: [quay(391, 198, 96, 13, 'PACKET WHARF'), quay(525, 191, 70, 12, 'SERVICE')], islands: [island(268, 72, 64, 36, 'Strömskär', 29), island(299, 334, 74, 25, '', 30), island(447, 81, 63, 33, '', 31)]
        },
        {
            id: 'island-exchange', name: 'Island Exchange', kind: 'A return service · a changing manifest', world: [560, 380], start: [88, 260, 0], spec: FERRY, berth: slip(88, 260),
            brief: 'Take four vehicles to the eastern landing. Two stay there; two new vans join the ferry. Bring all four vehicles now aboard back to the mainland, and finish where you began.',
            tip: 'Loading and unloading change your mass during the same voyage. The destination is always the amber ramp. Back clear, turn in open water, and line up again for the home berth.',
            pace: [390, 535, 750], jobs: [
                load('Mainland · board 4', 88, 260, ['car', 'car', 'van', 'car']), unload('East landing · unload 2', 472, 260, 2), { ...load('East landing · board 2 vans', 472, 260, ['van', 'van']), rampEnd: 1 }, { ...unload('Mainland · unload 4', 88, 260, 4), rampEnd: -1 }
            ],
            obstacles: [quay(39, 237, 30, 46, 'MAINLAND'), quay(491, 237, 34, 46, 'EAST LANDING')],
            islands: [island(32, 261, 25, 68, 'Mainland', 32), island(533, 261, 23, 65, 'Aspö', 33), island(285, 154, 67, 71, 'Long Island', 34), island(290, 342, 66, 21, '', 35)]
        },
        {
            id: 'two-calls', name: 'One Line, Two Calls', kind: 'Two disabled vessels · separate berths', world: [660, 380], start: [142, 262, 0], spec: TUG, berth: berth(588, 98),
            brief: 'Take the motor yacht to the southern marina. Then head north, make fast to the fishing boat and bring her home to the net shed. The dispatch order matters.',
            tip: 'Delivered vessels are secured by their shore crews. Your line comes free automatically. The next casualty stays at anchor until you attach; there is no hidden countdown.',
            pace: [460, 640, 880], towables: [boat('yacht', 'SEA SWALLOW', 80, 262, 52, 12, 2.1), boat('fishing', 'FISHING BOAT', 313, 98, 46, 12, 2.6, 'fishing')],
            jobs: [tow('yacht', 'Yacht · south marina', 332, 262, 76, 34), tow('fishing', 'Fishing boat · net shed', 493, 98, 76, 34)],
            obstacles: [quay(291, 284, 84, 12, 'SOUTH MARINA'), quay(449, 120, 91, 13, 'NET SHED'), quay(565, 113, 68, 12, 'SERVICE')],
            islands: [island(237, 149, 49, 39, 'Harbor Island', 36), island(455, 332, 60, 23, '', 37), island(468, 40, 63, 20, '', 38)]
        },
        {
            id: 'cars-and-casualty', name: 'Cars and a Casualty', kind: 'Ferry duty first · rescue on the way home', world: [620, 380], start: [88, 274, 0], spec: { ...FERRY, propulsion: 1.6, name: 'MS LINNEA' }, berth: berth(554, 101),
            brief: 'Complete the four-car crossing before answering a stranded yacht’s call. With the deck empty, use the ferry’s stern towing point to bring the casualty to the northern guest harbor.',
            tip: 'The ferry can tow, but it is not as nimble as Sisu. Finish the passenger job before making fast. The work panel changes from manifest to towline instruments when rescue duty begins.',
            pace: [465, 650, 900], jobs: [load('Mainland · board 4', 88, 274, ['car', 'car', 'van', 'car']), unload('Island · unload 4', 472, 274, 4), tow('casualty', 'Yacht · guest harbor', 445, 101, 74, 34)], towables: [boat('casualty', 'MORNING STAR', 286, 101, 44, 11, 1.9)],
            obstacles: [quay(39, 251, 30, 46, 'MAINLAND'), quay(491, 251, 31, 46, 'ISLAND'), quay(404, 123, 84, 13, 'GUEST HARBOR'), quay(530, 117, 65, 12, 'SERVICE')],
            islands: [island(31, 274, 26, 62, '', 39), island(540, 275, 31, 58, 'Lillö', 40), island(239, 186, 55, 33, '', 41), island(459, 40, 63, 20, '', 42)]
        },
        {
            id: 'midsummer-dispatch', name: 'Midsummer Dispatch', kind: 'Five vehicles · two islands · one rescue', world: [700, 420], start: [91, 321, 0], spec: { ...FERRY, propulsion: 1.6, name: 'MS LINNEA' }, berth: berth(625, 195),
            brief: 'The long evening is a busy one. Board five vehicles, collect channel clearance, catch the bridge and serve both island ramps. Then recover the disabled launch and finish at the service station.',
            tip: 'This is a whole shift, not a single docking. The manifest and amber markers name the next job. Leave turning room for the launch on the last leg, and protect the clean run through the village water.',
            pace: [660, 900, 1250], current: [.035, -.025], jobs: [load('Mainland · board 5', 91, 321, ['car', 'van', 'car', 'car', 'van']), unload('South village · unload 3', 596, 321, 3), unload('North village · unload 2', 596, 85, 2), tow('launch', 'Launch · rescue landing', 508, 195, 78, 36)],
            towables: [boat('launch', 'MIDSUMMER LAUNCH', 394, 107, 48, 12, 2.2, 'packet')], buoys: [
                {
                    x: 180, y: 331, r: 27, name: 'Channel clearance', hold: 1, speed: 1.2
                }
            ],
            gates: [
                {
                    id: 'summer-bridge', x: 378, y: 285, w: 7, h: 115, kind: 'timed', keys: 1, period: 61, open: 30, offset: 7
                }
            ],
            obstacles: [
                quay(42, 298, 30, 46, 'MAINLAND'), quay(615, 298, 36, 46, 'SOUTH VILLAGE'), quay(615, 62, 36, 46, 'NORTH VILLAGE'), quay(464, 218, 94, 12, 'RESCUE LANDING'), quay(601, 211, 73, 12, 'STATION'), {
                    x: 372, y: 183, w: 18, h: 103, label: 'BRIDGE ABUTMENT'
                }
            ],
            shelters: [lee(557, 39, 115, 335)], speedZones: [
                {
                    x: 541, y: 131, w: 130, h: 145, limit: 1.7
                }
            ], traffic: [
                {
                    id: 'summer-post', from: [452, 78], to: [452, 361], speed: 1.1, offset: 59, length: 17, beam: 6
                }
            ],
            islands: [island(34, 321, 25, 63, '', 43), island(283, 223, 58, 102, 'Storö', 44), island(659, 321, 30, 62, 'South Village', 45), island(659, 85, 30, 57, 'North Village', 46), island(251, 70, 77, 34, 'Midsummer Skerries', 47)]
        }
    ];
    if (typeof module !== 'undefined' && module.exports)
        module.exports = levels;
    root.HarborArchipelago = levels;
})(typeof globalThis !== 'undefined' ? globalThis : this);
