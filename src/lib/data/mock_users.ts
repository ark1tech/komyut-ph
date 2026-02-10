export interface User {
	uid: number;
	email: string;
	username: string;
	first_name: string;
	last_name: string;
	middle_name: string | null;
}

export const mockUsers: User[] = [
	{
		uid: 1,
		email: 'sarah.martinez@email.com',
		username: 'sarahm',
		first_name: 'Sarah',
		last_name: 'Martinez',
		middle_name: 'Elizabeth'
	},
	{
		uid: 2,
		email: 'james.chen@email.com',
		username: 'jchen',
		first_name: 'James',
		last_name: 'Chen',
		middle_name: 'Wei'
	},
	{
		uid: 3,
		email: 'emily.johnson@email.com',
		username: 'emilyjay',
		first_name: 'Emily',
		last_name: 'Johnson',
		middle_name: null
	},
	{
		uid: 4,
		email: 'michael.oconnor@email.com',
		username: 'mikeoconnor',
		first_name: 'Michael',
		last_name: "O'Connor",
		middle_name: 'Patrick'
	},
	{
		uid: 5,
		email: 'priya.patel@email.com',
		username: 'priyap',
		first_name: 'Priya',
		last_name: 'Patel',
		middle_name: 'Anjali'
	},
	{
		uid: 6,
		email: 'david.kim@email.com',
		username: 'dkim',
		first_name: 'David',
		last_name: 'Kim',
		middle_name: 'Sung'
	},
	{
		uid: 7,
		email: 'amanda.brown@email.com',
		username: 'amandab',
		first_name: 'Amanda',
		last_name: 'Brown',
		middle_name: 'Marie'
	},
	{
		uid: 8,
		email: 'carlos.rodriguez@email.com',
		username: 'carlosr',
		first_name: 'Carlos',
		last_name: 'Rodriguez',
		middle_name: 'Antonio'
	},
	{
		uid: 9,
		email: 'jessica.williams@email.com',
		username: 'jessicaw',
		first_name: 'Jessica',
		last_name: 'Williams',
		middle_name: null
	},
	{
		uid: 10,
		email: 'ryan.thompson@email.com',
		username: 'ryant',
		first_name: 'Ryan',
		last_name: 'Thompson',
		middle_name: 'James'
	}
];
