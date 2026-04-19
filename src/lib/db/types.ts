export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
	// Allows to automatically instantiate createClient with right options
	// instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
	__InternalSupabase: {
		PostgrestVersion: '14.5';
	};
	graphql_public: {
		Tables: {
			[_ in never]: never;
		};
		Views: {
			[_ in never]: never;
		};
		Functions: {
			graphql: {
				Args: {
					extensions?: Json;
					operationName?: string;
					query?: string;
					variables?: Json;
				};
				Returns: Json;
			};
		};
		Enums: {
			[_ in never]: never;
		};
		CompositeTypes: {
			[_ in never]: never;
		};
	};
	public: {
		Tables: {
			custom_attribute_defs: {
				Row: {
					created_at: string;
					id: string;
					key: string;
					label: string;
					order_index: number;
					owner_id: string;
					required: boolean;
					table_name: string;
					type: Database['public']['Enums']['custom_attr_type'];
					ui_hints: Json;
					updated_at: string;
				};
				Insert: {
					created_at?: string;
					id?: string;
					key: string;
					label: string;
					order_index?: number;
					owner_id: string;
					required?: boolean;
					table_name: string;
					type: Database['public']['Enums']['custom_attr_type'];
					ui_hints?: Json;
					updated_at?: string;
				};
				Update: {
					created_at?: string;
					id?: string;
					key?: string;
					label?: string;
					order_index?: number;
					owner_id?: string;
					required?: boolean;
					table_name?: string;
					type?: Database['public']['Enums']['custom_attr_type'];
					ui_hints?: Json;
					updated_at?: string;
				};
				Relationships: [];
			};
			habit_checks: {
				Row: {
					check_date: string;
					created_at: string;
					habit_id: string;
					id: string;
					owner_id: string;
				};
				Insert: {
					check_date?: string;
					created_at?: string;
					habit_id: string;
					id?: string;
					owner_id: string;
				};
				Update: {
					check_date?: string;
					created_at?: string;
					habit_id?: string;
					id?: string;
					owner_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'habit_checks_habit_id_fkey';
						columns: ['habit_id'];
						isOneToOne: false;
						referencedRelation: 'habits';
						referencedColumns: ['id'];
					}
				];
			};
			habits: {
				Row: {
					archived_at: string | null;
					cadence: string;
					created_at: string;
					custom: Json;
					description: string | null;
					id: string;
					name: string;
					owner_id: string;
					updated_at: string;
				};
				Insert: {
					archived_at?: string | null;
					cadence?: string;
					created_at?: string;
					custom?: Json;
					description?: string | null;
					id?: string;
					name: string;
					owner_id: string;
					updated_at?: string;
				};
				Update: {
					archived_at?: string | null;
					cadence?: string;
					created_at?: string;
					custom?: Json;
					description?: string | null;
					id?: string;
					name?: string;
					owner_id?: string;
					updated_at?: string;
				};
				Relationships: [];
			};
			journal_entries: {
				Row: {
					body: string | null;
					created_at: string;
					custom: Json;
					deleted_at: string | null;
					entry_date: string;
					id: string;
					mood: number | null;
					owner_id: string;
					title: string | null;
					updated_at: string;
				};
				Insert: {
					body?: string | null;
					created_at?: string;
					custom?: Json;
					deleted_at?: string | null;
					entry_date?: string;
					id?: string;
					mood?: number | null;
					owner_id: string;
					title?: string | null;
					updated_at?: string;
				};
				Update: {
					body?: string | null;
					created_at?: string;
					custom?: Json;
					deleted_at?: string | null;
					entry_date?: string;
					id?: string;
					mood?: number | null;
					owner_id?: string;
					title?: string | null;
					updated_at?: string;
				};
				Relationships: [];
			};
			profiles: {
				Row: {
					avatar_url: string | null;
					created_at: string;
					display_name: string | null;
					id: string;
					updated_at: string;
				};
				Insert: {
					avatar_url?: string | null;
					created_at?: string;
					display_name?: string | null;
					id: string;
					updated_at?: string;
				};
				Update: {
					avatar_url?: string | null;
					created_at?: string;
					display_name?: string | null;
					id?: string;
					updated_at?: string;
				};
				Relationships: [];
			};
			shares: {
				Row: {
					created_at: string;
					grantee_id: string;
					id: string;
					owner_id: string;
					perms: Database['public']['Enums']['share_perm'][];
					resource_id: string | null;
					resource_type: string;
					scope: Json;
					updated_at: string;
				};
				Insert: {
					created_at?: string;
					grantee_id: string;
					id?: string;
					owner_id: string;
					perms?: Database['public']['Enums']['share_perm'][];
					resource_id?: string | null;
					resource_type: string;
					scope?: Json;
					updated_at?: string;
				};
				Update: {
					created_at?: string;
					grantee_id?: string;
					id?: string;
					owner_id?: string;
					perms?: Database['public']['Enums']['share_perm'][];
					resource_id?: string | null;
					resource_type?: string;
					scope?: Json;
					updated_at?: string;
				};
				Relationships: [];
			};
			sleep_logs: {
				Row: {
					created_at: string;
					custom: Json;
					deleted_at: string | null;
					hours_slept: number | null;
					id: string;
					log_date: string;
					notes: string | null;
					owner_id: string;
					quality: number | null;
					updated_at: string;
					went_to_bed: string | null;
					woke_up: string | null;
				};
				Insert: {
					created_at?: string;
					custom?: Json;
					deleted_at?: string | null;
					hours_slept?: number | null;
					id?: string;
					log_date?: string;
					notes?: string | null;
					owner_id: string;
					quality?: number | null;
					updated_at?: string;
					went_to_bed?: string | null;
					woke_up?: string | null;
				};
				Update: {
					created_at?: string;
					custom?: Json;
					deleted_at?: string | null;
					hours_slept?: number | null;
					id?: string;
					log_date?: string;
					notes?: string | null;
					owner_id?: string;
					quality?: number | null;
					updated_at?: string;
					went_to_bed?: string | null;
					woke_up?: string | null;
				};
				Relationships: [];
			};
			tasks: {
				Row: {
					completed_at: string | null;
					created_at: string;
					custom: Json;
					deleted_at: string | null;
					description: string | null;
					due_date: string | null;
					id: string;
					owner_id: string;
					priority: number | null;
					project_id: string | null;
					status: Database['public']['Enums']['task_status'];
					title: string;
					updated_at: string;
				};
				Insert: {
					completed_at?: string | null;
					created_at?: string;
					custom?: Json;
					deleted_at?: string | null;
					description?: string | null;
					due_date?: string | null;
					id?: string;
					owner_id: string;
					priority?: number | null;
					project_id?: string | null;
					status?: Database['public']['Enums']['task_status'];
					title: string;
					updated_at?: string;
				};
				Update: {
					completed_at?: string | null;
					created_at?: string;
					custom?: Json;
					deleted_at?: string | null;
					description?: string | null;
					due_date?: string | null;
					id?: string;
					owner_id?: string;
					priority?: number | null;
					project_id?: string | null;
					status?: Database['public']['Enums']['task_status'];
					title?: string;
					updated_at?: string;
				};
				Relationships: [];
			};
		};
		Views: {
			[_ in never]: never;
		};
		Functions: {
			can_access: {
				Args: {
					p_extra?: Json;
					p_perm?: Database['public']['Enums']['share_perm'];
					p_resource_id: string;
					p_resource_type: string;
				};
				Returns: boolean;
			};
			find_user_by_email: { Args: { p_email: string }; Returns: string };
		};
		Enums: {
			custom_attr_type:
				| 'text'
				| 'longtext'
				| 'number'
				| 'boolean'
				| 'date'
				| 'datetime'
				| 'select'
				| 'multiselect'
				| 'url'
				| 'rating';
			share_perm: 'read' | 'comment' | 'write';
			task_status: 'todo' | 'doing' | 'done' | 'cancelled';
		};
		CompositeTypes: {
			[_ in never]: never;
		};
	};
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
	DefaultSchemaTableNameOrOptions extends
		| keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
		| { schema: keyof DatabaseWithoutInternals },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
				DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
		: never = never
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
			DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
			Row: infer R;
		}
		? R
		: never
	: DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
		? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
				Row: infer R;
			}
			? R
			: never
		: never;

export type TablesInsert<
	DefaultSchemaTableNameOrOptions extends
		| keyof DefaultSchema['Tables']
		| { schema: keyof DatabaseWithoutInternals },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
		: never = never
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
			Insert: infer I;
		}
		? I
		: never
	: DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
		? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
				Insert: infer I;
			}
			? I
			: never
		: never;

export type TablesUpdate<
	DefaultSchemaTableNameOrOptions extends
		| keyof DefaultSchema['Tables']
		| { schema: keyof DatabaseWithoutInternals },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
		: never = never
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
			Update: infer U;
		}
		? U
		: never
	: DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
		? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
				Update: infer U;
			}
			? U
			: never
		: never;

export type Enums<
	DefaultSchemaEnumNameOrOptions extends
		| keyof DefaultSchema['Enums']
		| { schema: keyof DatabaseWithoutInternals },
	EnumName extends DefaultSchemaEnumNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
		: never = never
> = DefaultSchemaEnumNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
	: DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
		? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
		: never;

export type CompositeTypes<
	PublicCompositeTypeNameOrOptions extends
		| keyof DefaultSchema['CompositeTypes']
		| { schema: keyof DatabaseWithoutInternals },
	CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
		: never = never
> = PublicCompositeTypeNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
	: PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
		? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
		: never;

export const Constants = {
	graphql_public: {
		Enums: {}
	},
	public: {
		Enums: {
			custom_attr_type: [
				'text',
				'longtext',
				'number',
				'boolean',
				'date',
				'datetime',
				'select',
				'multiselect',
				'url',
				'rating'
			],
			share_perm: ['read', 'comment', 'write'],
			task_status: ['todo', 'doing', 'done', 'cancelled']
		}
	}
} as const;
