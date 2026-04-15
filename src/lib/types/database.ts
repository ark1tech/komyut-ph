export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
	public: {
		Tables: {
			comment: {
				Row: {
					author_id: string;
					body: string;
					comment_id: number;
					created_at: string;
					downvotes: number;
					last_edited: string;
					linked_post_id: string | null;
					parent_id: string;
					upvotes: number;
				};
				Insert: {
					author_id: string;
					body: string;
					comment_id?: number;
					created_at?: string;
					downvotes?: number;
					last_edited?: string;
					linked_post_id?: string | null;
					parent_id: string;
					upvotes?: number;
				};
				Update: {
					author_id?: string;
					body?: string;
					comment_id?: number;
					created_at?: string;
					downvotes?: number;
					last_edited?: string;
					linked_post_id?: string | null;
					parent_id?: string;
					upvotes?: number;
				};
				Relationships: [
					{
						foreignKeyName: 'comment_author_id_fkey';
						columns: ['author_id'];
						isOneToOne: false;
						referencedRelation: 'user';
						referencedColumns: ['uid'];
					},
					{
						foreignKeyName: 'comment_linked_post_id_fkey';
						columns: ['linked_post_id'];
						isOneToOne: false;
						referencedRelation: 'post';
						referencedColumns: ['post_id'];
					},
					{
						foreignKeyName: 'comment_parent_id_fkey';
						columns: ['parent_id'];
						isOneToOne: false;
						referencedRelation: 'post';
						referencedColumns: ['post_id'];
					}
				];
			};
			notification: {
				Row: {
					created_at: string;
					is_read: boolean;
					kind: Database['public']['Enums']['notification_kind'];
					message: string;
					notification_id: number;
					post_id: string | null;
					route_id: number | null;
					user_id: string;
				};
				Insert: {
					created_at?: string;
					is_read?: boolean;
					kind: Database['public']['Enums']['notification_kind'];
					message: string;
					notification_id?: number;
					post_id?: string | null;
					route_id?: number | null;
					user_id: string;
				};
				Update: {
					created_at?: string;
					is_read?: boolean;
					kind?: Database['public']['Enums']['notification_kind'];
					message?: string;
					notification_id?: number;
					post_id?: string | null;
					route_id?: number | null;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'notification_post_id_fkey';
						columns: ['post_id'];
						isOneToOne: false;
						referencedRelation: 'post';
						referencedColumns: ['post_id'];
					},
					{
						foreignKeyName: 'notification_route_id_fkey';
						columns: ['route_id'];
						isOneToOne: false;
						referencedRelation: 'route';
						referencedColumns: ['route_id'];
					},
					{
						foreignKeyName: 'notification_user_id_fkey';
						columns: ['user_id'];
						isOneToOne: false;
						referencedRelation: 'user';
						referencedColumns: ['uid'];
					}
				];
			};
			post: {
				Row: {
					author_id: string;
					body: string;
					created_at: string;
					downvotes: number;
					last_edited: string;
					post_id: string;
					title: string;
					upvotes: number;
				};
				Insert: {
					author_id: string;
					body: string;
					created_at?: string;
					downvotes?: number;
					last_edited?: string;
					post_id?: string;
					title: string;
					upvotes?: number;
				};
				Update: {
					author_id?: string;
					body?: string;
					created_at?: string;
					downvotes?: number;
					last_edited?: string;
					post_id?: string;
					title?: string;
					upvotes?: number;
				};
				Relationships: [
					{
						foreignKeyName: 'post_author_id_fkey';
						columns: ['author_id'];
						isOneToOne: false;
						referencedRelation: 'user';
						referencedColumns: ['uid'];
					}
				];
			};
			prefs: {
				Row: {
					access_need: string | null;
					pref_id: number;
					transpo_mode: string | null;
					travel_priority: string | null;
				};
				Insert: {
					access_need?: string | null;
					pref_id?: number;
					transpo_mode?: string | null;
					travel_priority?: string | null;
				};
				Update: {
					access_need?: string | null;
					pref_id?: number;
					transpo_mode?: string | null;
					travel_priority?: string | null;
				};
				Relationships: [];
			};
			review: {
				Row: {
					author_id: string;
					body: string;
					created_at: string;
					downvotes: number;
					last_edited: string;
					review_id: number;
					route_id: number;
					upvotes: number;
				};
				Insert: {
					author_id: string;
					body: string;
					created_at?: string;
					downvotes?: number;
					last_edited?: string;
					review_id?: number;
					route_id: number;
					upvotes?: number;
				};
				Update: {
					author_id?: string;
					body?: string;
					created_at?: string;
					downvotes?: number;
					last_edited?: string;
					review_id?: number;
					route_id?: number;
					upvotes?: number;
				};
				Relationships: [];
			};
			route: {
				Row: {
					created_at: string;
					end_loc: string;
					end_loc_osmid: number | null;
					est_time_of_arrival: number;
					fare: number;
					geometry: unknown;
					pwd_friendly: boolean;
					route_id: number;
					route_name: string;
					start_loc: string;
					start_loc_osmid: number | null;
					vehicle_types: string[];
					mode_segments: Json | null;
				};
				Insert: {
					created_at?: string;
					end_loc?: string;
					end_loc_osmid?: number | null;
					est_time_of_arrival?: number;
					fare?: number;
					geometry?: unknown;
					pwd_friendly?: boolean;
					route_id?: number;
					route_name?: string;
					start_loc?: string;
					start_loc_osmid?: number | null;
					vehicle_types?: string[];
					mode_segments?: Json | null;
				};
				Update: {
					created_at?: string;
					end_loc?: string;
					end_loc_osmid?: number | null;
					est_time_of_arrival?: number;
					fare?: number;
					geometry?: unknown;
					pwd_friendly?: boolean;
					route_id?: number;
					route_name?: string;
					start_loc?: string;
					start_loc_osmid?: number | null;
					vehicle_types?: string[];
					mode_segments?: Json | null;
				};
				Relationships: [];
			};
			route_subscription: {
				Row: {
					alert_types: string[];
					created_at: string;
					notify_email: boolean;
					notify_in_app: boolean;
					notify_push: boolean;
					route_id: number;
					saved_route_id: number | null;
					status: Database['public']['Enums']['route_subscription_status'];
					subscription_id: number;
					updated_at: string;
					user_id: string;
				};
				Insert: {
					alert_types?: string[];
					created_at?: string;
					notify_email?: boolean;
					notify_in_app?: boolean;
					notify_push?: boolean;
					route_id: number;
					saved_route_id?: number | null;
					status?: Database['public']['Enums']['route_subscription_status'];
					subscription_id?: number;
					updated_at?: string;
					user_id: string;
				};
				Update: {
					alert_types?: string[];
					created_at?: string;
					notify_email?: boolean;
					notify_in_app?: boolean;
					notify_push?: boolean;
					route_id?: number;
					saved_route_id?: number | null;
					status?: Database['public']['Enums']['route_subscription_status'];
					subscription_id?: number;
					updated_at?: string;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'route_subscription_user_id_fkey';
						columns: ['user_id'];
						isOneToOne: false;
						referencedRelation: 'user';
						referencedColumns: ['uid'];
					},
					{
						foreignKeyName: 'route_subscription_route_id_fkey';
						columns: ['route_id'];
						isOneToOne: false;
						referencedRelation: 'route';
						referencedColumns: ['route_id'];
					},
					{
						foreignKeyName: 'route_subscription_saved_route_id_fkey';
						columns: ['saved_route_id'];
						isOneToOne: false;
						referencedRelation: 'saved_route';
						referencedColumns: ['saved_route_id'];
					}
				];
			};
			saved_route: {
				Row: {
					created_at: string;
					geo_route_id: number | null;
					saved_route_id: number;
					user_id: string;
				};
				Insert: {
					created_at?: string;
					geo_route_id?: number | null;
					saved_route_id?: number;
					user_id: string;
				};
				Update: {
					created_at?: string;
					geo_route_id?: number | null;
					saved_route_id?: number;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'saved_route_geo_route_id_fkey';
						columns: ['geo_route_id'];
						isOneToOne: false;
						referencedRelation: 'route';
						referencedColumns: ['route_id'];
					},
					{
						foreignKeyName: 'saved_route_user_id_fkey';
						columns: ['user_id'];
						isOneToOne: false;
						referencedRelation: 'user';
						referencedColumns: ['uid'];
					}
				];
			};
			tag: {
				Row: {
					icon_url: string | null;
					tag_id: number;
					text: string;
				};
				Insert: {
					icon_url?: string | null;
					tag_id?: number;
					text: string;
				};
				Update: {
					icon_url?: string | null;
					tag_id?: number;
					text?: string;
				};
				Relationships: [];
			};
			user: {
				Row: {
					avatar_url: string | null;
					created_at: string;
					email: string;
					first_name: string | null;
					full_name: string;
					last_name: string | null;
					last_updated_at: string;
					middle_name: string | null;
					pref_id: number | null;
					suffix_name: string | null;
					uid: string;
					user_location: string | null;
					username: string;
				};
				Insert: {
					avatar_url?: string | null;
					created_at?: string;
					email: string;
					first_name?: string | null;
					full_name: string;
					last_name?: string | null;
					last_updated_at?: string;
					middle_name?: string | null;
					pref_id?: number | null;
					suffix_name?: string | null;
					uid: string;
					user_location?: string | null;
					username: string;
				};
				Update: {
					avatar_url?: string | null;
					created_at?: string;
					email?: string;
					first_name?: string | null;
					full_name?: string;
					last_name?: string | null;
					last_updated_at?: string;
					middle_name?: string | null;
					pref_id?: number | null;
					suffix_name?: string | null;
					uid?: string;
					user_location?: string | null;
					username?: string;
				};
				Relationships: [];
			};
		};
		Views: Record<string, never>;
		Functions: {
			resolve_location_to_point: {
				Args: { search_term: string };
				Returns: Json | null;
			};
			get_routes_near_point: {
				Args: {
					origin_geojson: Json;
					dest_geojson: Json;
					radius_m?: number;
				};
				Returns: Array<{
					route_id: number;
					route_name: string;
					vehicle_types: string[];
					mode_segments: Json | null;
					geometry_json: Json;
					board_point: Json;
					is_direct: boolean;
				}>;
			};
			get_routes_near_geom: {
				Args: {
					current_geojson: Json;
					board_geojson: Json;
					dest_geojson: Json;
					visited_ids: number[];
					radius_m?: number;
				};
				Returns: Array<{
					route_id: number;
					route_name: string;
					vehicle_types: string[];
					mode_segments: Json | null;
					geometry_json: Json;
					board_point: Json;
					alight_point: Json;
					is_direction_valid: boolean;
					is_destination_hit: boolean;
				}>;
			};
			clip_route_geometry: {
				Args: {
					route_geojson: Json;
					board_geojson: Json;
					alight_geojson: Json;
				};
				Returns: Json | null;
			};
			get_walk_distance_m: {
				Args: {
					from_geojson: Json;
					to_geojson: Json;
				};
				Returns: number;
			};
		};
		Enums: {
			notification_kind: 'upvote' | 'downvote' | 'comment' | 'route_alert';
			route_subscription_status: 'active' | 'muted' | 'unsubscribed';
		};
		CompositeTypes: Record<string, never>;
	};
};

// Convenience row types used throughout the app
export type UserRow = Database['public']['Tables']['user']['Row'];
export type PostRow = Database['public']['Tables']['post']['Row'];
export type CommentRow = Database['public']['Tables']['comment']['Row'];
export type NotificationRow = Database['public']['Tables']['notification']['Row'];
export type SavedRouteRow = Database['public']['Tables']['saved_route']['Row'];
export type RouteSubscriptionRow = Database['public']['Tables']['route_subscription']['Row'];
export type NotificationKind = Database['public']['Enums']['notification_kind'];
