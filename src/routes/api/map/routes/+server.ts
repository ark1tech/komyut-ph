import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) => {
    const {
		url,
		locals: { supabase }
	} = event;

    const start_loc = "371357222";
    const end_loc = url.searchParams.get('end');

    if (!end_loc || end_loc.trim() === '') {
        return error(400, 'Invalid location');
    }

    
    try {
        const { data, error } = await supabase
        .from("route")
        .select("route_id, geometry")
        .eq("start_loc_osmid", start_loc)
        .eq("end_loc_osmid", end_loc);

        if (error) throw error;

        return json({
            success: true,
            results: data || [],
        });
    } catch (error) {
        console.error("route error: ", error);
        return json(
            { error: "failed to view routes" },
            { status: 500 }
        );
    }
}