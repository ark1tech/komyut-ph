// src/lib/data/mockPosts.ts
export interface Post {
	post_id: number;
	author_id: number;
	author_name: string;
	author_username: string;
	created_at: string;
	last_edited: string;
	title: string;
	body: string;
	upvotes: number;
	downvotes: number;
}

export const mockPosts: Post[] = [
	{
		post_id: 1,
		author_id: 1,
		author_name: 'Sarah Martinez',
		author_username: 'sarahm',
		created_at: '2024-01-15T10:30:00Z',
		last_edited: '2024-01-15T10:30:00Z',
		title: 'How to get from Quezon City to Makati?',
		body: "I need to go to Ayala Avenue from SM North EDSA. What's the fastest route during rush hour? I'm open to any mode of transport.",
		upvotes: 42,
		downvotes: 3
	},
	{
		post_id: 2,
		author_id: 2,
		author_name: 'James Chen',
		author_username: 'jchen',
		created_at: '2024-01-16T14:20:00Z',
		last_edited: '2024-01-16T15:45:00Z',
		title: 'Best way to Mall of Asia from Cubao?',
		body: "Planning to visit MOA this weekend. Coming from Cubao, what's the most convenient way? Prefer air-conditioned options if possible. Budget is around 200 pesos.",
		upvotes: 87,
		downvotes: 5
	},
	{
		post_id: 3,
		author_id: 3,
		author_name: 'Emily Johnson',
		author_username: 'emilyjay',
		created_at: '2024-01-17T09:15:00Z',
		last_edited: '2024-01-17T09:15:00Z',
		title: 'Manila to Tagaytay commute guide needed',
		body: 'First time going to Tagaytay via commute. Starting from Manila City Hall. What buses should I take? Any tips for a first-timer?',
		upvotes: 156,
		downvotes: 8
	},
	{
		post_id: 4,
		author_id: 4,
		author_name: "Michael O'Connor",
		author_username: 'mikeoconnor',
		created_at: '2024-01-18T16:45:00Z',
		last_edited: '2024-01-18T16:45:00Z',
		title: 'BGC to NAIA Terminal 3 early morning',
		body: "I have a 6 AM flight. What time should I leave BGC and what's the best transport option at 3-4 AM? Are there any 24/7 options?",
		upvotes: 64,
		downvotes: 12
	},
	{
		post_id: 5,
		author_id: 5,
		author_name: 'Priya Patel',
		author_username: 'priyap',
		created_at: '2024-01-19T11:00:00Z',
		last_edited: '2024-01-19T11:30:00Z',
		title: 'Commute from Fairview to Ortigas Center',
		body: "Need to be in Ortigas by 9 AM. What's the best combination of MRT/bus/jeep from Fairview? Want to avoid being late for my interview!",
		upvotes: 203,
		downvotes: 4
	},
	{
		post_id: 6,
		author_id: 6,
		author_name: 'David Kim',
		author_username: 'dkim',
		created_at: '2024-01-20T13:30:00Z',
		last_edited: '2024-01-20T13:30:00Z',
		title: 'How to get to UP Diliman from Pasay?',
		body: 'Going to UP for the first time. Starting from Pasay Rotonda. Is MRT + jeep the best option or are there direct buses?',
		upvotes: 91,
		downvotes: 28
	},
	{
		post_id: 7,
		author_id: 7,
		author_name: 'Amanda Brown',
		author_username: 'amandab',
		created_at: '2024-01-21T08:20:00Z',
		last_edited: '2024-01-21T08:20:00Z',
		title: 'Alabang to Antipolo - is this even possible?',
		body: "Need to visit a friend in Antipolo. I'm coming from Alabang. This seems really far - what's the most efficient route? Should I just book a Grab?",
		upvotes: 312,
		downvotes: 2
	},
	{
		post_id: 8,
		author_id: 8,
		author_name: 'Carlos Rodriguez',
		author_username: 'carlosr',
		created_at: '2024-01-22T15:10:00Z',
		last_edited: '2024-01-22T15:10:00Z',
		title: 'Cheapest route from España to Cavite?',
		body: "Student here on a tight budget. Need to get to Bacoor, Cavite from España, Manila. What's the cheapest combination? Time is not a big issue.",
		upvotes: 77,
		downvotes: 6
	},
	{
		post_id: 9,
		author_id: 9,
		author_name: 'Jessica Williams',
		author_username: 'jessicaw',
		created_at: '2024-01-23T10:45:00Z',
		last_edited: '2024-01-23T11:15:00Z',
		title: 'Eastwood to Greenhills route?',
		body: 'Need to go to Greenhills Shopping Center from Eastwood City. What jeep or bus should I take? Is it walking distance from any MRT station?',
		upvotes: 134,
		downvotes: 15
	},
	{
		post_id: 10,
		author_id: 10,
		author_name: 'Ryan Thompson',
		author_username: 'ryant',
		created_at: '2024-01-24T12:00:00Z',
		last_edited: '2024-01-24T12:00:00Z',
		title: 'PWD-friendly route to Manila Ocean Park',
		body: 'Looking for wheelchair-accessible transportation from Quezon Avenue to Manila Ocean Park. What are my options? Any specific operators to contact?',
		upvotes: 445,
		downvotes: 3
	},
	{
		post_id: 11,
		author_id: 1,
		author_name: 'Sarah Martinez',
		author_username: 'sarahm',
		created_at: '2024-01-25T09:30:00Z',
		last_edited: '2024-01-25T09:30:00Z',
		title: 'Late night commute from BGC to Fairview',
		body: 'Work ends at 11 PM in BGC. Need to get back to Fairview. What are the available options at that time? Safety is a concern.',
		upvotes: 58,
		downvotes: 9
	},
	{
		post_id: 12,
		author_id: 3,
		author_name: 'Emily Johnson',
		author_username: 'emilyjay',
		created_at: '2024-01-26T14:15:00Z',
		last_edited: '2024-01-26T14:15:00Z',
		title: 'Marikina to Bonifacio High Street',
		body: "Visiting BGC for the first time from Marikina. What's the most straightforward route? I get confused with all the bus and train transfers.",
		upvotes: 189,
		downvotes: 7
	}
];
