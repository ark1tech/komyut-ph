// src/lib/data/mockComments.ts
export interface Comment {
	comment_id: number;
	author_id: number;
	author_name: string;
	author_username: string;
	parent_id: number; // post_id
	created_at: string;
	last_edited: string;
	body: string;
	upvotes: number;
	downvotes: number;
}

export const mockComments: Comment[] = [
	// Comments on Post 1 (QC to Makati)
	{
		comment_id: 1,
		author_id: 2,
		author_name: 'James Chen',
		author_username: 'jchen',
		parent_id: 1,
		created_at: '2024-01-15T11:00:00Z',
		last_edited: '2024-01-15T11:00:00Z',
		body: "Take MRT from North Avenue to Ayala Station. From SM North, walk to TriNoma then to North Avenue MRT. Exit at Ayala and you're already there! Takes about 45 mins to 1 hour.",
		upvotes: 15,
		downvotes: 1
	},
	{
		comment_id: 2,
		author_id: 4,
		author_name: "Michael O'Connor",
		author_username: 'mikeoconnor',
		parent_id: 1,
		created_at: '2024-01-15T12:30:00Z',
		last_edited: '2024-01-15T12:30:00Z',
		body: 'Alternative: Take a bus to EDSA-Ayala. Look for buses with "Ayala" signage at the SM North bus terminal. Cheaper than MRT but might take longer depending on traffic.',
		upvotes: 8,
		downvotes: 0
	},
	{
		comment_id: 3,
		author_id: 7,
		author_name: 'Amanda Brown',
		author_username: 'amandab',
		parent_id: 1,
		created_at: '2024-01-15T15:20:00Z',
		last_edited: '2024-01-15T15:20:00Z',
		body: 'During rush hour, MRT is definitely faster even with the crowd. Just avoid 7-9 AM and 5-7 PM if you can!',
		upvotes: 5,
		downvotes: 0
	},

	// Comments on Post 2 (Cubao to MOA)
	{
		comment_id: 4,
		author_id: 5,
		author_name: 'Priya Patel',
		author_username: 'priyap',
		parent_id: 2,
		created_at: '2024-01-16T16:00:00Z',
		last_edited: '2024-01-16T16:00:00Z',
		body: 'From Cubao: 1) Take MRT to Taft Avenue Station, 2) Walk to LRT-1 EDSA Station, 3) Take LRT-1 to Baclaran, 4) Ride MOA-bound jeep or take a short Grab. Total: ~150 pesos',
		upvotes: 23,
		downvotes: 0
	},
	{
		comment_id: 5,
		author_id: 6,
		author_name: 'David Kim',
		author_username: 'dkim',
		parent_id: 2,
		created_at: '2024-01-16T17:15:00Z',
		last_edited: '2024-01-16T17:45:00Z',
		body: "Easier option: Take the P2P bus from Cubao to MOA! It's airconditioned, direct, and costs around 75 pesos. Check the terminal at Gateway Mall or Farmers Plaza.",
		upvotes: 31,
		downvotes: 2
	},
	{
		comment_id: 6,
		author_id: 1,
		author_name: 'Sarah Martinez',
		author_username: 'sarahm',
		parent_id: 2,
		created_at: '2024-01-17T08:00:00Z',
		last_edited: '2024-01-17T08:00:00Z',
		body: "I second the P2P bus! Super convenient and you don't have to deal with train transfers.",
		upvotes: 12,
		downvotes: 0
	},

	// Comments on Post 3 (Manila to Tagaytay)
	{
		comment_id: 7,
		author_id: 8,
		author_name: 'Carlos Rodriguez',
		author_username: 'carlosr',
		parent_id: 3,
		created_at: '2024-01-17T10:30:00Z',
		last_edited: '2024-01-17T10:30:00Z',
		body: 'From Manila City Hall: 1) Go to LRT-1 UN Avenue Station, 2) Ride to EDSA, 3) Transfer to MRT, go to Taft, 4) From Taft, ride bus to Nasugbu/Lemery/Balayan via Tagaytay at Buendia-Taft terminal. Fare: ~150-200 pesos',
		upvotes: 42,
		downvotes: 8
	},
	{
		comment_id: 8,
		author_id: 10,
		author_name: 'Ryan Thompson',
		author_username: 'ryant',
		parent_id: 3,
		created_at: '2024-01-17T11:45:00Z',
		last_edited: '2024-01-17T11:45:00Z',
		body: 'Better option: Take jeep/bus to Coastal Mall, then ride Tagaytay-bound bus from Coastal terminal. Direct and less hassle! Buses leave every 30 mins.',
		upvotes: 67,
		downvotes: 5
	},
	{
		comment_id: 9,
		author_id: 2,
		author_name: 'James Chen',
		author_username: 'jchen',
		parent_id: 3,
		created_at: '2024-01-17T13:20:00Z',
		last_edited: '2024-01-17T13:20:00Z',
		body: "Bring a jacket! It gets cold in Tagaytay. Also, buses drop you at Olivarez - you'll need a tricycle or jeep to get to specific destinations from there.",
		upvotes: 89,
		downvotes: 1
	},

	// Comments on Post 4 (BGC to NAIA Terminal 3)
	{
		comment_id: 10,
		author_id: 3,
		author_name: 'Emily Johnson',
		author_username: 'emilyjay',
		parent_id: 4,
		created_at: '2024-01-18T17:30:00Z',
		last_edited: '2024-01-18T17:30:00Z',
		body: 'Book an airport taxi or Grab the night before. At 3-4 AM, public transport is very limited. Should cost 250-400 pesos. Leave by 4 AM latest to be safe!',
		upvotes: 18,
		downvotes: 0
	},
	{
		comment_id: 11,
		author_id: 9,
		author_name: 'Jessica Williams',
		author_username: 'jessicaw',
		parent_id: 4,
		created_at: '2024-01-18T19:00:00Z',
		last_edited: '2024-01-18T19:00:00Z',
		body: 'There are 24/7 airport shuttle services from BGC but you need to book ahead. Check UBE Express or other airport transfer services. More reliable than waiting for Grab at that hour.',
		upvotes: 25,
		downvotes: 3
	},

	// Comments on Post 5 (Fairview to Ortigas)
	{
		comment_id: 12,
		author_id: 4,
		author_name: "Michael O'Connor",
		author_username: 'mikeoconnor',
		parent_id: 5,
		created_at: '2024-01-19T12:00:00Z',
		last_edited: '2024-01-19T12:00:00Z',
		body: 'From Fairview: 1) Ride jeep to Philcoa, 2) Walk to UP-Diliman Station, 3) Take MRT to Ortigas. If you leave by 7 AM, you should make it by 8:30 AM. Good luck on your interview!',
		upvotes: 45,
		downvotes: 0
	},
	{
		comment_id: 13,
		author_id: 6,
		author_name: 'David Kim',
		author_username: 'dkim',
		parent_id: 5,
		created_at: '2024-01-19T13:30:00Z',
		last_edited: '2024-01-19T13:30:00Z',
		body: 'Alternative: Take the Fairview-Ortigas bus! Direct route, about 1-1.5 hours depending on traffic. Catch it at Fairview terminal near SM. Fare is around 50 pesos.',
		upvotes: 38,
		downvotes: 1
	},
	{
		comment_id: 14,
		author_id: 8,
		author_name: 'Carlos Rodriguez',
		author_username: 'carlosr',
		parent_id: 5,
		created_at: '2024-01-19T15:45:00Z',
		last_edited: '2024-01-19T15:45:00Z',
		body: 'The bus is more comfortable! Just make sure to ask the driver to drop you at your specific destination in Ortigas.',
		upvotes: 29,
		downvotes: 0
	},

	// Comments on Post 7 (Alabang to Antipolo)
	{
		comment_id: 15,
		author_id: 1,
		author_name: 'Sarah Martinez',
		author_username: 'sarahm',
		parent_id: 7,
		created_at: '2024-01-21T09:15:00Z',
		last_edited: '2024-01-21T09:15:00Z',
		body: "It's definitely doable! 1) From Alabang, take bus to Crossing/Shaw, 2) Ride jeep to Rosario/Sta. Lucia, 3) Transfer to Antipolo-bound jeep. Takes 2-3 hours total. Fare: ~150 pesos",
		upvotes: 56,
		downvotes: 0
	},
	{
		comment_id: 16,
		author_id: 5,
		author_name: 'Priya Patel',
		author_username: 'priyap',
		parent_id: 7,
		created_at: '2024-01-21T10:30:00Z',
		last_edited: '2024-01-21T10:30:00Z',
		body: 'Honestly, if you can afford it, Grab might be worth it for this distance. Commute will take forever with all the transfers. Grab would be ~800-1000 pesos.',
		upvotes: 41,
		downvotes: 0
	},
	{
		comment_id: 17,
		author_id: 9,
		author_name: 'Jessica Williams',
		author_username: 'jessicaw',
		parent_id: 7,
		created_at: '2024-01-21T12:00:00Z',
		last_edited: '2024-01-21T12:00:00Z',
		body: 'Middle ground: Take bus to Cubao, then take UV Express van to Antipolo from Farmers Plaza. Faster than full commute, cheaper than Grab. ~200-250 pesos total.',
		upvotes: 78,
		downvotes: 1
	},

	// Comments on Post 10 (PWD-friendly to Manila Ocean Park)
	{
		comment_id: 18,
		author_id: 2,
		author_name: 'James Chen',
		author_username: 'jchen',
		parent_id: 10,
		created_at: '2024-01-24T13:00:00Z',
		last_edited: '2024-01-24T13:00:00Z',
		body: 'MRT has wheelchair access at some stations including Quezon Avenue. Take MRT to UN Avenue, then book an accessible taxi service. Try TNVS apps - they have PWD-friendly options.',
		upvotes: 92,
		downvotes: 0
	},
	{
		comment_id: 19,
		author_id: 4,
		author_name: "Michael O'Connor",
		author_username: 'mikeoconnor',
		parent_id: 10,
		created_at: '2024-01-24T14:30:00Z',
		last_edited: '2024-01-24T14:30:00Z',
		body: "Contact DOTr's accessible transport hotline: 1342. They can arrange special transport. Also, Manila Ocean Park itself is wheelchair accessible with ramps and elevators.",
		upvotes: 67,
		downvotes: 1
	},
	{
		comment_id: 20,
		author_id: 7,
		author_name: 'Amanda Brown',
		author_username: 'amandab',
		parent_id: 10,
		created_at: '2024-01-24T16:00:00Z',
		last_edited: '2024-01-24T16:00:00Z',
		body: "Some modern jeepneys are PWD-accessible now! Look for the ones with low floors and ramps. Route signs will indicate if they're accessible. Good luck!",
		upvotes: 103,
		downvotes: 0
	},

	// Comments on Post 12 (Marikina to BGC)
	{
		comment_id: 21,
		author_id: 6,
		author_name: 'David Kim',
		author_username: 'dkim',
		parent_id: 12,
		created_at: '2024-01-26T15:00:00Z',
		last_edited: '2024-01-26T15:00:00Z',
		body: 'From Marikina: 1) Take jeep to Sta. Lucia Mall, 2) Ride bus to Shaw Blvd, 3) Take BGC Bus at Starmall Shaw. It stops at various BGC points including High Street. Total: ~80-100 pesos',
		upvotes: 44,
		downvotes: 2
	},
	{
		comment_id: 22,
		author_id: 10,
		author_name: 'Ryan Thompson',
		author_username: 'ryant',
		parent_id: 12,
		created_at: '2024-01-26T16:30:00Z',
		last_edited: '2024-01-26T16:30:00Z',
		body: 'Simpler: Take UV Express from Marikina to Ayala/Makati, then ride BGC bus from there. UV Express terminal is near Marikina City Hall. Faster and more comfortable!',
		upvotes: 38,
		downvotes: 0
	}
];
